// POST /api/auth/identify
//
// Determines user role via the founder-controlled authorized_teachers whitelist.
// Every signup defaults to student. Role = teacher only if the email exists in
// authorized_teachers. Google Classroom API is called on the teacher path only —
// for course syncing, not for role detection.
//
// Error contract:
//   400 — missing/invalid body
//   401 — Google token invalid or no email returned
//   503 — Supabase error (whitelist check or upsert) — never falls to student silently
//
// Request:  POST { accessToken: string }
// Response: { role, userId, googleId, email, name, courses }

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

  // ── 1. Resolve Google identity ─────────────────────────────────────────────
  const profileRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch Google profile' }, { status: 401 });
  }
  const profile = await profileRes.json();
  const { id: googleId, email: rawEmail, name } = profile;
  if (!rawEmail) {
    return NextResponse.json({ error: 'Google token did not return an email' }, { status: 401 });
  }
  const email = rawEmail.toLowerCase();
  const nameParts = (name ?? '').split(' ');

  // ── 2. Whitelist check — fail closed on DB error ───────────────────────────
  // Never fall through to the student path if Supabase is unreachable.
  const { data: whitelist, error: whitelistError } = await supabaseAdmin
    .from('authorized_teachers')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (whitelistError) {
    console.error('[identify] whitelist lookup error:', whitelistError);
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  const isTeacher = whitelist !== null;

  // ── 3a. Teacher path ───────────────────────────────────────────────────────
  if (isTeacher) {
    // Classroom API for course syncing only — role is already decided by the whitelist.
    let courses: { id: string; name: string; section: string | null }[] = [];
    const classroomRes = await fetch(
      'https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE&courseStates=PROVISIONED',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (classroomRes.ok) {
      const data = await classroomRes.json();
      courses = (data.courses ?? []).map((c: { id: string; name: string; section?: string }) => ({
        id:      c.id,
        name:    c.name,
        section: c.section ?? null,
      }));
    } else {
      console.warn('[identify] classroom API status (teacher):', classroomRes.status);
    }

    const { data: teacher, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          email,
          role:       'teacher',
          full_name:  name ?? '',
          first_name: nameParts[0] ?? '',
          google_id:  googleId,
          gc_courses: courses,
        },
        { onConflict: 'email' },
      )
      .select('user_id')
      .single();

    if (upsertError || !teacher) {
      console.error('[identify] upsert teacher error:', upsertError);
      return NextResponse.json({ error: 'Failed to save teacher' }, { status: 503 });
    }

    return NextResponse.json({
      role:     'teacher',
      userId:   teacher.user_id,
      googleId,
      email,
      name,
      courses,
    });
  }

  // ── 3b. Student path ───────────────────────────────────────────────────────
  const { data: student, error: studentError } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        email,
        role:       'student',
        full_name:  name ?? '',
        first_name: nameParts[0] ?? '',
      },
      { onConflict: 'email' },
    )
    .select('user_id')
    .single();

  if (studentError || !student) {
    console.error('[identify] upsert student error:', studentError);
    return NextResponse.json({ error: 'Failed to save student' }, { status: 503 });
  }

  return NextResponse.json({
    role:     'student',
    userId:   student.user_id,
    googleId,
    email,
    name,
    courses:  [],
  });
}
