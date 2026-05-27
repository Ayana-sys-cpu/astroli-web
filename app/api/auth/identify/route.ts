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

// ── Auth helpers ───────────────────────────────────────────────────────────────

async function findAuthUserByEmail(email: string): Promise<{ id: string } | null> {
  try {
    const url = new URL('/auth/v1/admin/users', process.env.NEXT_PUBLIC_SUPABASE_URL!);
    url.searchParams.set('email', email);
    url.searchParams.set('page', '1');
    url.searchParams.set('per_page', '1');
    const res = await fetch(url.toString(), {
      headers: {
        apikey:        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.users as { id: string }[])?.[0] ?? null;
  } catch {
    return null;
  }
}

async function upsertAuthUserAndToken(
  email: string,
  metadata: { role: string; student_id?: string | null; teacher_id?: string | null },
): Promise<{ authUserId: string; authToken: string } | null> {
  let authUserId: string;

  const existing = await findAuthUserByEmail(email);
  if (existing) {
    authUserId = existing.id;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      user_metadata: metadata,
      email_confirm: true,
    });
    if (error) {
      console.error('[identify] updateUserById', error);
      return null;
    }
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error || !data.user) {
      console.error('[identify] createUser', error);
      return null;
    }
    authUserId = data.user.id;
  }

  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type:    'magiclink',
    email,
    options: { data: metadata },
  });
  if (linkError || !link) {
    console.error('[identify] generateLink', linkError);
    return null;
  }

  return { authUserId, authToken: (link.properties as any).hashed_token };
}

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

    const authResult = await upsertAuthUserAndToken(email, {
      role:       'teacher',
      teacher_id: teacher.user_id,
      student_id: null,
    });

    // Best-effort: store the Supabase Auth UUID back in the users row for linkage.
    if (authResult?.authUserId) {
      await supabaseAdmin
        .from('users')
        .update({ auth_user_id: authResult.authUserId })
        .eq('user_id', teacher.user_id);
    }

    return NextResponse.json({
      role:      'teacher',
      userId:    teacher.user_id,
      googleId,
      email,
      name,
      courses,
      authToken: authResult?.authToken ?? null,
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

  const authResult = await upsertAuthUserAndToken(email, {
    role:       'student',
    student_id: student.user_id,
    teacher_id: null,
  });

  // Best-effort: store the Supabase Auth UUID back in the users row for linkage.
  if (authResult?.authUserId) {
    await supabaseAdmin
      .from('users')
      .update({ auth_user_id: authResult.authUserId })
      .eq('user_id', student.user_id);
  }

  return NextResponse.json({
    role:      'student',
    userId:    student.user_id,
    googleId,
    email,
    name,
    courses:   [],
    authToken: authResult?.authToken ?? null,
  });
}
