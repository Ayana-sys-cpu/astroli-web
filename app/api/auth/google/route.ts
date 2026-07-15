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
import { supabaseAdmin, supabaseAnon } from '@/lib/supabase-server';
import { upsertAuthUserAndToken } from '@/lib/auth-token';
import { parseBody, AuthCodeSchema } from '@/lib/validate';
import { enrollStudentInJourneys } from '@/lib/enroll-student';

// ── Alien identity helpers (mirrors /api/student) ─────────────────────────────

const ALIEN_PREFIXES = ['Xylo','Kael','Zyr','Vor','Nexo','Ael','Crix','Thal','Grix','Oru','Vex','Nyx','Zara','Phos','Quill'];
const ALIEN_SUFFIXES = ['-9','-Flux','-Prime','-Zyx','-Omni','-Sol','-Nix','-Ren','-X','-Pulse','-Arc','-Zero'];

function fallbackAlienName(): string {
  const p = ALIEN_PREFIXES[Math.floor(Math.random() * ALIEN_PREFIXES.length)];
  const s = ALIEN_SUFFIXES[Math.floor(Math.random() * ALIEN_SUFFIXES.length)];
  return p + s;
}

async function generateAlienName(): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackAlienName();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16,
        messages: [{ role: 'user', content: "Invent one unique sci-fi alien name for a student's avatar companion in a space learning game. One word, 5–10 characters, kid-friendly, memorable, no real words. Reply with ONLY the name." }],
      }),
    });
    if (!res.ok) return fallbackAlienName();
    const json = await res.json();
    const n = (json.content?.[0]?.text ?? '').trim().replace(/[^A-Za-z0-9\-]/g, '');
    return n.length >= 3 && n.length <= 20 ? n : fallbackAlienName();
  } catch {
    return fallbackAlienName();
  }
}

function pickAvatarUrl(): string {
  const index = Math.floor(Math.random() * 10) + 1;
  return `/avatars/base/base-${String(index).padStart(2, '0')}.png`;
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
    return NextResponse.json(
      { error: 'Failed to exchange authorization code' },
      { status: 401 },
    );
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

  // ── 4b-pre. Parent whitelist check ───────────────────────────────────────
  if (!isTeacher) {
    const { data: parentWhitelist, error: parentWhitelistError } = await supabaseAdmin
      .from('authorized_parents')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (parentWhitelistError) {
      console.error('[google] parent whitelist lookup error:', parentWhitelistError);
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }

    if (parentWhitelist !== null) {
      const { data: parent, error: parentUpsertError } = await supabaseAdmin
        .from('users')
        .upsert(
          { email, role: 'parent', full_name: name ?? '', first_name: nameParts[0] ?? '', google_id: googleId },
          { onConflict: 'email' },
        )
        .select('id')
        .single();

      if (parentUpsertError || !parent) {
        console.error('[google] upsert parent error:', parentUpsertError);
        return NextResponse.json({ error: 'Failed to save parent' }, { status: 503 });
      }

      // Query child/journey state BEFORE generating the auth token so we can
      // embed has_child in user_metadata. The session check on the login page
      // reads user_metadata.has_child to decide whether to show the welcome
      // tour or jump straight to the dashboard.
      const [{ data: childLink }, { data: familyClass }] = await Promise.all([
        supabaseAdmin.from('parent_child_link').select('child_id').eq('parent_id', parent.id).maybeSingle(),
        supabaseAdmin.from('classes').select('id').eq('teacher_id', parent.id).eq('type', 'family').maybeSingle(),
      ]);

      const authResult = await upsertAuthUserAndToken(email, {
        role: 'parent', parent_id: parent.id, student_id: null, teacher_id: null,
        // true once the parent has a linked child OR has picked a journey —
        // both mean onboarding is complete; skip the welcome tour on next login.
        has_child: childLink !== null || familyClass !== null,
      }, 'google');
      if (!authResult) {
        return NextResponse.json({ error: 'Failed to create auth session' }, { status: 503 });
      }

      await supabaseAdmin.from('users').update({ auth_user_id: authResult.authUserId }).eq('id', parent.id);

      return NextResponse.json({
        role:       'parent',
        name,
        email,
        authToken:  authResult.authToken,
        hasChild:   childLink !== null,
        hasJourney: familyClass !== null,
      });
    }

    // Waitlist path — not teacher, not approved parent
    // Use array query instead of maybeSingle(): when duplicate rows exist
    // (email column may lack a UNIQUE constraint) maybeSingle() returns null,
    // causing a registered student to be misidentified as unregistered and
    // sent down the invite/waitlist path. Prefer the student-role row.
    const { data: userRoles } = await supabaseAdmin
      .from('users').select('role').eq('email', email);
    const existingUser = (userRoles ?? []).find(u => u.role === 'student')
      ?? (userRoles ?? [])[0]
      ?? null;

    if (!existingUser || existingUser.role === 'parent') {
      // Before waitlisting, check for a pending invite. If the student received
      // an invite link but landed here via the main login instead (e.g. their
      // browser blocked the Google popup on the accept-invite page), send them
      // back to the accept-invite page rather than to the waitlist.
      // Use array query + limit(1) instead of maybeSingle() — there may be
      // multiple pending rows (one per resend), and maybeSingle() silently
      // returns null when it finds more than one, causing a false waitlist hit.
      const { data: pendingInvites } = await supabaseAdmin
        .from('child_invites')
        .select('token')
        .eq('child_email', email)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      const pendingInvite = pendingInvites?.[0] ?? null;

      if (pendingInvite) {
        // Send a magic link so the student authenticates via email rather than
        // being redirected to a page where they'd have no Supabase session yet.
        // The link routes through /auth/callback which exchanges the code and
        // then redirects to /auth/accept-invite, where the flow auto-completes.
        const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';
        const callbackUrl = `${baseUrl}/auth/callback?invite=${pendingInvite.token}`;
        const { error: otpErr } = await supabaseAnon.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: callbackUrl },
        });
        if (otpErr) {
          console.error('[google] OTP send for invite failed:', otpErr);
          // Fall back to redirect so the student isn't left stranded.
          return NextResponse.json({ role: 'invited', inviteToken: pendingInvite.token });
        }
        return NextResponse.json({ role: 'invited', emailSent: true });
      }

      await supabaseAdmin
        .from('parent_waitlist')
        .upsert({ email, name: name ?? '' }, { onConflict: 'email', ignoreDuplicates: true });

      return NextResponse.json(
        { role: 'waitlisted', message: 'Astroli is currently in limited early access.' },
        { status: 403 },
      );
    }
  }

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
      .select('id')
      .single();

    if (upsertError || !teacher) {
      console.error('[google] upsert teacher error:', upsertError);
      return NextResponse.json({ error: 'Failed to save teacher' }, { status: 503 });
    }

    const authResult = await upsertAuthUserAndToken(email, {
      role: 'teacher', teacher_id: teacher.id, student_id: null,
    }, 'google');
    if (!authResult) {
      return NextResponse.json({ error: 'Failed to create auth session' }, { status: 503 });
    }

    await supabaseAdmin.from('users').update({ auth_user_id: authResult.authUserId }).eq('id', teacher.id);

    return NextResponse.json({ role: 'teacher', name, email, courses, authToken: authResult.authToken });
  }

  // ── 4b. Student path ──────────────────────────────────────────────────────
  // Check existence before upsert so we know whether to generate an identity.
  // Use array query — prefer the row with alien_name (fully onboarded student)
  // so duplicate rows don't reset the student's identity on every sign-in.
  const { data: existingRows } = await supabaseAdmin
    .from('users')
    .select('id, first_name, base_avatar_url, alien_name')
    .eq('email', email);
  const existing = (existingRows ?? []).find(u => u.alien_name)
    ?? (existingRows ?? [])[0]
    ?? null;

  // A student needs onboarding if they have no alien_name — covers both genuinely
  // new users (no DB row) and users whose record exists but onboarding was never
  // completed (e.g. pre-enrolled by a teacher, or interrupted mid-flow).
  const isNewStudent = !existing || !existing.alien_name;

  // Upsert user row — safe to call on every sign-in.
  const { data: student, error: studentError } = await supabaseAdmin
    .from('users')
    .upsert(
      { email, role: 'student', full_name: name ?? '', first_name: nameParts[0] ?? '', google_id: googleId },
      { onConflict: 'email' },
    )
    .select('id, first_name, base_avatar_url, alien_name')
    .single();

  if (studentError || !student) {
    console.error('[google] upsert student error:', studentError);
    return NextResponse.json({ error: 'Failed to save student' }, { status: 503 });
  }

  // Canonical ID: always use the pre-existing row's ID when available.
  // The users table may lack a UNIQUE constraint on email, which means
  // the upsert can INSERT a new row instead of updating the existing one —
  // producing a duplicate row with a different UUID. Using the pre-existing
  // ID consistently ensures the enrollment in student_journeys and the
  // student_id stored in auth user_metadata always reference the same row.
  const canonicalStudentId = existing?.id ?? student.id;
  if (existing && existing.id !== student.id) {
    console.warn('[google] duplicate users row — existing.id:', existing.id, 'upsert.id:', student.id, '— using existing.id as canonical');
  }

  // Generate alien identity for new students; reuse existing for returning ones.
  // Prefer the canonical row's values — they may differ from student.* when a
  // duplicate row was inserted and student.* reflects the new (empty) row.
  let alienName     = (existing?.alien_name     ?? student.alien_name)     as string | null;
  let baseAvatarUrl = (existing?.base_avatar_url ?? student.base_avatar_url) as string | null;

  if (isNewStudent) {
    alienName     = 'Orin';
    baseAvatarUrl = '/avatars/base/base-03.png';
    // Do NOT save alien_name to DB here. The reveal page (/onboarding/reveal)
    // saves it via PATCH /api/student when the student clicks "BEGIN YOUR JOURNEY".
    // Saving here would cause isNewStudent to be false on the next sign-in if the
    // student closed the browser before completing the reveal, silently skipping
    // onboarding. The session cookie is always set by the time the reveal CTA fires
    // (verifyOtp runs before navigation, and the animation takes ~4s), so the PATCH
    // is reliable.
  }

  // Enroll student in matching journeys before returning — must be awaited so
  // the enrollment completes before the client navigates to /syncing and checks
  // journey status. Fire-and-forget silently fails on Vercel (function exits on
  // response, killing in-flight async work).
  await enrollStudentInJourneys(canonicalStudentId, accessToken);

  const authResult = await upsertAuthUserAndToken(email, {
    role: 'student', student_id: canonicalStudentId, teacher_id: null,
  }, 'google');
  if (!authResult) {
    return NextResponse.json({ error: 'Failed to create auth session' }, { status: 503 });
  }

  await supabaseAdmin.from('users').update({ auth_user_id: authResult.authUserId }).eq('id', canonicalStudentId);

  return NextResponse.json({
    role:         'student',
    name,
    email,
    authToken:    authResult.authToken,
    isNewStudent,
    firstName:    (student.first_name ?? nameParts[0]) as string,
    baseAvatarUrl,
    alienName,
  });
}
