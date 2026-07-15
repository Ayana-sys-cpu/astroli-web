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
import { supabaseAdmin } from '@/lib/supabase-server';
import { upsertAuthUserAndToken } from '@/lib/auth-token';
import { parseBody, AccessTokenSchema } from '@/lib/validate';

export async function POST(req: NextRequest) {
  try {
    return await handlePOST(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[identify] unhandled error:', message);
    return NextResponse.json({ error: 'Internal server error', detail: message }, { status: 500 });
  }
}

async function handlePOST(req: NextRequest) {
  const parsed = await parseBody(req, AccessTokenSchema);
  if (!parsed.ok) return parsed.response;
  const { accessToken } = parsed.data;

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

  // ── 3b-pre. Parent whitelist check ────────────────────────────────────────
  // Only reached when isTeacher is false. Fail closed on DB error.
  if (!isTeacher) {
    const { data: parentWhitelist, error: parentWhitelistError } = await supabaseAdmin
      .from('authorized_parents')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (parentWhitelistError) {
      console.error('[identify] parent whitelist lookup error:', parentWhitelistError);
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }

    if (parentWhitelist !== null) {
      // ── Parent path ──────────────────────────────────────────────────────
      const { data: parent, error: parentUpsertError } = await supabaseAdmin
        .from('users')
        .upsert(
          { email, role: 'parent', full_name: name ?? '', first_name: nameParts[0] ?? '' },
          { onConflict: 'email' },
        )
        .select('id')
        .single();

      if (parentUpsertError || !parent) {
        console.error('[identify] upsert parent error:', parentUpsertError);
        return NextResponse.json({ error: 'Failed to save parent' }, { status: 503 });
      }

      // Query child/journey state BEFORE generating the auth token so we can
      // embed has_child in user_metadata — mirrors the google route.
      const [{ data: childLink }, { data: familyClass }] = await Promise.all([
        supabaseAdmin.from('parent_child_link').select('child_id').eq('parent_id', parent.id).maybeSingle(),
        supabaseAdmin.from('classes').select('id').eq('teacher_id', parent.id).eq('type', 'family').maybeSingle(),
      ]);

      const authResult = await upsertAuthUserAndToken(email, {
        role:       'parent',
        student_id: null,
        teacher_id: null,
        // true once the parent has a linked child OR has picked a journey —
        // both mean onboarding is complete; skip the welcome tour on next login.
        has_child:  childLink !== null || familyClass !== null,
      }, 'identify');

      if (!authResult) {
        console.error('[identify] upsertAuthUserAndToken failed for parent:', email);
        return NextResponse.json({ error: 'Failed to create auth session' }, { status: 503 });
      }

      await supabaseAdmin.from('users').update({ auth_user_id: authResult.authUserId }).eq('id', parent.id);

      return NextResponse.json({
        role:       'parent',
        userId:     parent.id,
        googleId,
        email,
        name,
        authToken:  authResult.authToken,
        hasChild:   childLink !== null,
        hasJourney: familyClass !== null,
      });
    }

    // ── Waitlist path (non-approved, non-teacher, non-existing-parent) ─────
    // Check if already an existing parent or student before waitlisting
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('email', email)
      .maybeSingle();

    if (!existingUser || existingUser.role === 'parent') {
      // Insert into waitlist (ON CONFLICT DO NOTHING — no duplicate entries)
      await supabaseAdmin
        .from('parent_waitlist')
        .upsert({ email, name: name ?? '' }, { onConflict: 'email', ignoreDuplicates: true });

      return NextResponse.json(
        { role: 'waitlisted', message: 'Astroli is currently in limited early access.' },
        { status: 403 },
      );
    }
  }

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
      .select('id')
      .single();

    if (upsertError || !teacher) {
      console.error('[identify] upsert teacher error:', upsertError);
      return NextResponse.json({ error: 'Failed to save teacher' }, { status: 503 });
    }

    const authResult = await upsertAuthUserAndToken(email, {
      role:       'teacher',
      teacher_id: teacher.id,
      student_id: null,
    }, 'identify');

    if (!authResult) {
      console.error('[identify] upsertAuthUserAndToken failed for teacher:', email);
      return NextResponse.json({ error: 'Failed to create auth session' }, { status: 503 });
    }

    const { error: teacherLinkError } = await supabaseAdmin
      .from('users')
      .update({ auth_user_id: authResult.authUserId })
      .eq('id', teacher.id);
    if (teacherLinkError) console.warn('[identify] auth_user_id linkage failed (teacher):', teacherLinkError);

    return NextResponse.json({
      role:      'teacher',
      userId:    teacher.id,
      googleId,
      email,
      name,
      courses,
      authToken: authResult.authToken,
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
    .select('id')
    .single();

  if (studentError || !student) {
    console.error('[identify] upsert student error:', studentError);
    return NextResponse.json({ error: 'Failed to save student' }, { status: 503 });
  }

  const authResult = await upsertAuthUserAndToken(email, {
    role:       'student',
    student_id: student.id,
    teacher_id: null,
  }, 'identify');

  if (!authResult) {
    console.error('[identify] upsertAuthUserAndToken failed for student:', email);
    return NextResponse.json({ error: 'Failed to create auth session' }, { status: 503 });
  }

  const { error: studentLinkError } = await supabaseAdmin
    .from('users')
    .update({ auth_user_id: authResult.authUserId })
    .eq('id', student.id);
  if (studentLinkError) console.warn('[identify] auth_user_id linkage failed (student):', studentLinkError);

  return NextResponse.json({
    role:      'student',
    userId:    student.id,
    googleId,
    email,
    name,
    courses:   [],
    authToken: authResult.authToken,
  });
}
