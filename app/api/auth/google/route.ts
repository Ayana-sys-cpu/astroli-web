// =============================================================================
// POST /api/auth/google
//
// Authorization Code Flow endpoint — the more-secure alternative to the
// implicit flow used by /api/auth/identify.
//
// Flow:
//   1. Frontend calls google.accounts.oauth2.initCodeClient() and gets a
//      one-time authorization code (never an access token).
//   2. That code is sent here in the request body.
//   3. This endpoint exchanges it for an access token using the client secret
//      (which never leaves the server).
//   4. The access token is used to call Google APIs (userinfo, Classroom) and
//      then discarded — it is never returned to the browser.
//   5. A Supabase magic-link token is returned to the client to establish the
//      Supabase session, exactly as the identify route does.
//
// Prerequisite: GOOGLE_CLIENT_SECRET must be set in the server environment.
// The endpoint returns 503 if the secret is absent so the fallback token
// flow (/api/auth/identify) still works during the transition.
//
// To activate on the frontend:
//   In app/page.tsx, replace initTokenClient → initCodeClient and
//   requestAccessToken() → requestCode(), then POST { code } here instead of
//   { accessToken } to /api/auth/identify.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { parseBody, AuthCodeSchema } from '@/lib/validate';

// ── Shared helpers (mirrors /api/auth/identify) ───────────────────────────────

async function findAuthUserByEmail(email: string): Promise<{ id: string } | null> {
  try {
    const url = new URL('/auth/v1/admin/users', process.env.NEXT_PUBLIC_SUPABASE_URL!);
    url.searchParams.set('email', email);
    url.searchParams.set('page',  '1');
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
      console.error('[google] updateUserById', error);
      return null;
    }
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error || !data.user) {
      console.error('[google] createUser', error);
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
    console.error('[google] generateLink', linkError);
    return null;
  }

  const hashed_token = (link.properties as { hashed_token?: string }).hashed_token;
  if (!hashed_token) {
    console.error('[google] generateLink missing hashed_token');
    return null;
  }
  return { authUserId, authToken: hashed_token };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Guard — returns 503 when secret is absent so the old token-flow fallback
  // still works. Once the secret is added to Vercel env, this activates.
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientSecret) {
    return NextResponse.json(
      { error: 'Authorization code flow not yet configured on this server.' },
      { status: 503 },
    );
  }

  const parsed = await parseBody(req, AuthCodeSchema);
  if (!parsed.ok) return parsed.response;
  const { code } = parsed.data;

  // ── 1. Exchange authorization code for access token ───────────────────────
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      code,
      client_id:     process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      redirect_uri:  'postmessage', // Required for the popup/callback UX mode
      grant_type:    'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.json().catch(() => ({}));
    console.error('[google] token exchange failed:', detail);
    return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 401 });
  }

  const { access_token: accessToken } = await tokenRes.json();
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token in exchange response' }, { status: 401 });
  }

  // ── 2. Resolve Google identity ────────────────────────────────────────────
  const profileRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch Google profile' }, { status: 401 });
  }
  const profile = await profileRes.json();
  const { id: googleId, email: rawEmail, name } = profile;
  if (!rawEmail) {
    return NextResponse.json({ error: 'Google did not return an email' }, { status: 401 });
  }
  const email     = rawEmail.toLowerCase();
  const nameParts = (name ?? '').split(' ');

  // ── 3. Whitelist check — fail closed on DB error ──────────────────────────
  const { data: whitelist, error: whitelistError } = await supabaseAdmin
    .from('authorized_teachers')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (whitelistError) {
    console.error('[google] whitelist lookup error:', whitelistError);
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  const isTeacher = whitelist !== null;

  // ── 4a. Teacher path ──────────────────────────────────────────────────────
  if (isTeacher) {
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
    }

    const { data: teacher, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert(
        { email, role: 'teacher', full_name: name ?? '', first_name: nameParts[0] ?? '', google_id: googleId, gc_courses: courses },
        { onConflict: 'email' },
      )
      .select('user_id')
      .single();

    if (upsertError || !teacher) {
      console.error('[google] upsert teacher error:', upsertError);
      return NextResponse.json({ error: 'Failed to save teacher' }, { status: 503 });
    }

    const authResult = await upsertAuthUserAndToken(email, {
      role: 'teacher', teacher_id: teacher.user_id, student_id: null,
    });
    if (!authResult) {
      return NextResponse.json({ error: 'Failed to create auth session' }, { status: 503 });
    }

    await supabaseAdmin.from('users').update({ auth_user_id: authResult.authUserId }).eq('user_id', teacher.user_id);

    return NextResponse.json({ role: 'teacher', name, email, courses, authToken: authResult.authToken });
  }

  // ── 4b. Student path ──────────────────────────────────────────────────────
  const { data: student, error: studentError } = await supabaseAdmin
    .from('users')
    .upsert(
      { email, role: 'student', full_name: name ?? '', first_name: nameParts[0] ?? '' },
      { onConflict: 'email' },
    )
    .select('user_id')
    .single();

  if (studentError || !student) {
    console.error('[google] upsert student error:', studentError);
    return NextResponse.json({ error: 'Failed to save student' }, { status: 503 });
  }

  const authResult = await upsertAuthUserAndToken(email, {
    role: 'student', student_id: student.user_id, teacher_id: null,
  });
  if (!authResult) {
    return NextResponse.json({ error: 'Failed to create auth session' }, { status: 503 });
  }

  await supabaseAdmin.from('users').update({ auth_user_id: authResult.authUserId }).eq('user_id', student.user_id);

  return NextResponse.json({ role: 'student', name, email, courses: [], authToken: authResult.authToken });
}
