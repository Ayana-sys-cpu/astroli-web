// POST /api/auth/apple
//
// Server-side Sign in with Apple gate for the mobile app — the Apple
// counterpart of /api/auth/student-status + /api/auth/identify (Google).
//
// The app sends the identityToken JWT it received from the native Apple
// sign-in sheet. We verify the signature against Apple's published JWKS and
// check issuer/audience/expiry server-side — the client's word is never
// trusted. Verification uses node:crypto only (no jose dependency).
//
// Identity resolution, in order:
//   1. users.apple_user_id = token.sub          (returning Apple user)
//   2. users.email = token.email                (existing account, first
//      Apple sign-in — apple_user_id is linked for next time)
//   3. neither → create a student account and enroll it in the demo class
//      so a first Apple sign-in lands in a populated app.
//
// Apple only provides the user's name on the FIRST authorization, and only
// client-side — so the app forwards fullName/firstName in the body. On
// repeat sign-ins those are absent and the stored name is used.
//
// Response mirrors /api/auth/student-status:
//   { exists, onboardingComplete, studentId, firstName, baseAvatarUrl,
//     avatarUrl, alienName, authToken }
// The client exchanges authToken for a session via POST /api/auth/session.
//
// Error contract:
//   400 — missing/invalid body
//   401 — identity token failed verification (signature, issuer, audience,
//         expiry) or carried no usable identity
//   403 — the Apple ID resolves to a non-student account (teacher/parent —
//         they sign in on the web app, not the student app)
//   503 — Supabase error

import { createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { upsertAuthUserAndToken } from '@/lib/auth-token';
import { enrollStudentInDemoClass } from '@/lib/demo-class';
import { parseBody, z } from '@/lib/validate';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_AUDIENCE = 'com.ayanar.astroli'; // iOS bundle identifier

const AppleSignInSchema = z.object({
  identityToken: z.string().min(1),
  fullName: z.string().trim().max(200).optional(),
  firstName: z.string().trim().max(100).optional(),
});

interface AppleJwk {
  kid: string;
  alg: string;
  kty: string;
  n: string;
  e: string;
  use: string;
}

// Apple rotates these rarely; cache for an hour to keep sign-in latency low.
let jwksCache: { keys: AppleJwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getAppleJwks(): Promise<AppleJwk[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(APPLE_JWKS_URL);
  if (!res.ok) throw new Error(`Apple JWKS fetch failed: ${res.status}`);
  const data = (await res.json()) as { keys: AppleJwk[] };
  if (!Array.isArray(data.keys) || data.keys.length === 0) {
    throw new Error('Apple JWKS response contained no keys');
  }
  jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

function b64urlToBuffer(segment: string): Buffer {
  return Buffer.from(segment, 'base64url');
}

function decodeJson<T>(segment: string): T | null {
  try {
    return JSON.parse(b64urlToBuffer(segment).toString('utf8')) as T;
  } catch {
    return null;
  }
}

interface AppleTokenClaims {
  sub: string;
  email: string | null;
}

/**
 * Verifies the Apple identity token: RS256 signature against Apple's JWKS,
 * then issuer / audience / expiry. Returns the stable Apple user id (sub)
 * and email, or null if any check fails.
 */
async function verifyAppleIdentityToken(token: string): Promise<AppleTokenClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeJson<{ alg?: string; kid?: string }>(headerB64);
  const payload = decodeJson<{
    iss?: string; aud?: string | string[]; exp?: number; sub?: string; email?: string;
  }>(payloadB64);
  if (!header || !payload) return null;
  if (header.alg !== 'RS256' || !header.kid) return null;

  let jwk: AppleJwk | undefined;
  try {
    const keys = await getAppleJwks();
    jwk = keys.find((k) => k.kid === header.kid && k.kty === 'RSA');
    if (!jwk) {
      // Key rotation between cache refreshes — refetch once before failing.
      jwksCache = null;
      jwk = (await getAppleJwks()).find((k) => k.kid === header.kid && k.kty === 'RSA');
    }
  } catch (err) {
    console.error('[auth/apple] JWKS fetch error:', err);
    return null;
  }
  if (!jwk) return null;

  let signatureValid = false;
  try {
    const publicKey = createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' });
    signatureValid = cryptoVerify(
      'RSA-SHA256',
      Buffer.from(`${headerB64}.${payloadB64}`),
      publicKey,
      b64urlToBuffer(signatureB64),
    );
  } catch (err) {
    console.error('[auth/apple] signature verification error:', err);
    return null;
  }
  if (!signatureValid) return null;

  if (payload.iss !== APPLE_ISSUER) return null;
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(APPLE_AUDIENCE)) return null;
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null;
  if (!payload.sub) return null;

  return { sub: payload.sub, email: payload.email?.toLowerCase() ?? null };
}

export async function POST(req: NextRequest) {
  try {
    return await handlePOST(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[auth/apple] unhandled error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePOST(req: NextRequest) {
  const parsed = await parseBody(req, AppleSignInSchema);
  if (!parsed.ok) return parsed.response;
  const { identityToken, fullName, firstName } = parsed.data;

  const claims = await verifyAppleIdentityToken(identityToken);
  if (!claims) {
    return NextResponse.json({ error: 'Invalid Apple identity token' }, { status: 401 });
  }
  const { sub: appleUserId, email } = claims;

  // ── Resolve the account: apple_user_id first, then email ──────────────────
  const userColumns = 'id, role, email, first_name, base_avatar_url, avatar_url, alien_name, apple_user_id';

  const { data: byAppleId, error: appleLookupError } = await supabaseAdmin
    .from('users')
    .select(userColumns)
    .eq('apple_user_id', appleUserId)
    .maybeSingle();
  if (appleLookupError) {
    console.error('[auth/apple] apple_user_id lookup error:', appleLookupError);
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  let user = byAppleId;
  if (!user && email) {
    const { data: byEmail, error: emailLookupError } = await supabaseAdmin
      .from('users')
      .select(userColumns)
      .eq('email', email)
      .maybeSingle();
    if (emailLookupError) {
      console.error('[auth/apple] email lookup error:', emailLookupError);
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    user = byEmail;
    // Remember the Apple ID so repeat sign-ins resolve even if Apple ever
    // omits the email claim.
    if (user && !user.apple_user_id) {
      await supabaseAdmin.from('users').update({ apple_user_id: appleUserId }).eq('id', user.id);
    }
  }

  let exists = true;
  if (!user) {
    // ── Genuinely new: create a student account ─────────────────────────────
    if (!email) {
      // Without an email we can neither create the account nor mint a
      // session token. Apple includes the email claim (real or private
      // relay) for tokens issued to the app itself, so this is a hard edge.
      return NextResponse.json({ error: 'Apple token did not include an email' }, { status: 401 });
    }
    exists = false;
    const resolvedFullName = fullName || firstName || 'Explorer';
    const resolvedFirstName = firstName || resolvedFullName.split(' ')[0] || 'Explorer';
    const { data: created, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        role: 'student',
        full_name: resolvedFullName,
        first_name: resolvedFirstName,
        apple_user_id: appleUserId,
      })
      .select(userColumns)
      .single();
    if (createError || !created) {
      console.error('[auth/apple] student create error:', createError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 503 });
    }
    user = created;
    await enrollStudentInDemoClass(user.id);
    console.log(`[auth/apple] created student ${user.id} for Apple user ${appleUserId}`);
  }

  // ── Students only — this is the student app ────────────────────────────────
  if (user.role !== 'student') {
    return NextResponse.json(
      { error: 'This Apple ID belongs to a teacher or parent account. Please sign in on the web app.' },
      { status: 403 },
    );
  }

  // ── Mint the single-use sign-in token (exchanged via /api/auth/session) ───
  const authResult = await upsertAuthUserAndToken(
    user.email,
    { role: 'student', student_id: user.id, teacher_id: null },
    'auth/apple',
  );
  if (!authResult) {
    return NextResponse.json({ error: 'Failed to create auth session' }, { status: 503 });
  }
  await supabaseAdmin.from('users').update({ auth_user_id: authResult.authUserId }).eq('id', user.id);

  // Same heuristic as student-status: the reveal step sets alien_name/avatar,
  // so their absence means onboarding hasn't been completed yet.
  const onboardingComplete = !!(user.alien_name || user.base_avatar_url || user.avatar_url);

  return NextResponse.json({
    exists,
    onboardingComplete,
    studentId: user.id,
    // The stored account email. Apple omits the email claim from the client
    // credential on repeat sign-ins, so the app relies on this for session
    // persistence.
    email: user.email,
    firstName: user.first_name ?? null,
    baseAvatarUrl: user.base_avatar_url ?? null,
    avatarUrl: user.avatar_url ?? null,
    alienName: user.alien_name ?? null,
    authToken: authResult.authToken,
  });
}
