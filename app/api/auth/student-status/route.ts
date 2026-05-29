/**
 * POST /api/auth/student-status
 *
 * Server-side routing gate for the student login flow.
 * Accepts a Google access token, resolves the user's email server-side,
 * and returns whether this is an existing user — without trusting any
 * client-side state. The login page uses this to decide routing; no
 * client can bypass it by clearing localStorage.
 *
 * Routing contract (matches spec):
 *   { exists: true  } → existing user  → bypass all onboarding → home (/syncing)
 *   { exists: false } → new user       → full onboarding flow  → /onboarding/interest
 *
 * Existence is determined by a single lookup in users (Supabase).
 * Email is normalized to lowercase before the DB lookup — Postgres text
 * comparison is case-sensitive, so without normalization a mis-cased email
 * from Google would produce a false "new user" result.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { enrollStudentInJourneys } from '@/lib/enroll-student';
import { parseBody, AccessTokenSchema } from '@/lib/validate';

export async function POST(req: NextRequest) {
  // ── 1. Resolve identity from Google access token (server-side) ───────────
  const parsed = await parseBody(req, AccessTokenSchema);
  if (!parsed.ok) return parsed.response;
  const { accessToken } = parsed.data;

  let email: string;
  let firstName: string;
  let fullName: string;
  try {
    const profileRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Failed to verify Google token' }, { status: 401 });
    }
    const profile = await profileRes.json();
    // Normalize to lowercase — Postgres text comparison is case-sensitive.
    email     = (profile.email ?? '').toLowerCase();
    fullName  = profile.name ?? '';
    firstName = profile.given_name ?? fullName.split(' ')[0] ?? '';
    if (!email) {
      return NextResponse.json({ error: 'Google token did not return an email' }, { status: 401 });
    }
  } catch (err) {
    console.error('[student-status] Token resolution error:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // ── 2. Look up in users ──────────────────────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('user_id, first_name, base_avatar_url, avatar_url, alien_name')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('[student-status] Supabase lookup error:', error);
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  if (data) {
    console.log(`[student-status] ${email} found in users → existing user`);

    // Sync enrollment — fire-and-forget so sign-in latency is unaffected.
    // Idempotent upsert: safe to call on every sign-in.
    enrollStudentInJourneys(data.user_id, accessToken).catch(() => {});

    return NextResponse.json({
      exists:             true,
      onboardingComplete: true,
      studentId:          data.user_id,
      firstName:          data.first_name ?? firstName,
      baseAvatarUrl:      data.base_avatar_url ?? null,
      avatarUrl:          data.avatar_url ?? null,
      alienName:          data.alien_name ?? null,
    });
  }

  // ── 3. Genuinely new user ─────────────────────────────────────────────────
  console.log(`[student-status] ${email} not found → new user`);
  return NextResponse.json({ exists: false });
}
