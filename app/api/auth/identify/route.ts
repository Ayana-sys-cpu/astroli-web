// =============================================================================
// SUPABASE VERSION — /api/auth/identify
//
// Drop-in replacement for route.ts. Accepts the exact same request/response
// shape so the frontend (sign-in flow) works without any changes:
//
//   Request:  POST { accessToken: string }
//   Response: { role, userId, googleId, email, name, courses }
//
// KEY DIFFERENCE FROM THE PRISMA VERSION:
//   userId is now the Supabase teacher_id (UUID from the teachers table),
//   not a Prisma-generated UUID. Everything downstream that calls
//   getTeacherId() will receive and store this Supabase UUID — which is
//   exactly what /api/teacher/connect, /api/teacher/journeys, etc. expect.
//
// TEACHER PATH:
//   Upserts into the Supabase `teachers` table (keyed by google_id).
//   Returns teacher_id as userId.
//
// STUDENT PATH:
//   Students primarily use the mobile app, but if a student reaches the
//   web sign-in, we upsert them into app_students (keyed by email) —
//   same table the mobile app uses. Returns student_id as userId.
//
// HOW TO ACTIVATE:
//   Rename this file to route.ts (delete the old Prisma route.ts first).
//   This must be the FIRST route activated — it is what populates localStorage
//   with the correct Supabase teacher_id that all other routes depend on.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  let body: { accessToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { accessToken } = body;
  if (!accessToken) {
    return NextResponse.json({ error: 'accessToken required' }, { status: 400 });
  }

  // ── 1. Fetch Google user profile ───────────────────────────────────────────
  const profileRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch Google profile' }, { status: 401 });
  }
  const profile = await profileRes.json();
  const { id: googleId, email, name } = profile;

  // ── 2. Check Google Classroom ──────────────────────────────────────────────
  const classroomRes = await fetch(
    'https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE&courseStates=PROVISIONED',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  let classroomCourses: any[] = [];
  if (classroomRes.ok) {
    const data = await classroomRes.json();
    classroomCourses = data.courses ?? [];
    console.log('[identify] classroom courses found:', classroomCourses.length, classroomCourses.map((c: any) => c.name));
  } else {
    console.log('[identify] classroom API status:', classroomRes.status);
  }

  const isTeacher = classroomCourses.length > 0;
  const role      = isTeacher ? 'teacher' : 'student';
  const courses   = classroomCourses.map((c: any) => ({
    id:      c.id,
    name:    c.name,
    section: c.section ?? null,
  }));

  // ── 3a. Teacher: upsert into teachers table ────────────────────────────────
  if (isTeacher) {
    const { data: teacher, error } = await supabaseAdmin
      .from('teachers')
      .upsert(
        { google_id: googleId, email, name, gc_courses: courses },
        { onConflict: 'google_id' },
      )
      .select('teacher_id')
      .single();

    if (error || !teacher) {
      console.error('[identify] upsert teacher', error);
      return NextResponse.json({ error: 'Failed to save teacher' }, { status: 500 });
    }

    return NextResponse.json({
      role,
      userId:   teacher.teacher_id,   // stored by saveTeacher() as teacherId in localStorage
      googleId,
      email,
      name,
      courses,
    });
  }

  // ── 3b. Student: upsert into app_students table ────────────────────────────
  // Students reach the web identify route only if they sign in via the web app.
  // We upsert by email (same key the mobile app uses via /api/student).
  const nameParts  = (name ?? '').split(' ');
  const first_name = nameParts[0] ?? '';
  const full_name  = name ?? '';

  const { data: student, error: studentError } = await supabaseAdmin
    .from('app_students')
    .upsert(
      { email, full_name, first_name },
      { onConflict: 'email' },
    )
    .select('student_id')
    .single();

  if (studentError || !student) {
    console.error('[identify] upsert student', studentError);
    return NextResponse.json({ error: 'Failed to save student' }, { status: 500 });
  }

  return NextResponse.json({
    role,
    userId:   student.student_id,
    googleId,
    email,
    name,
    courses: [],
  });
}
