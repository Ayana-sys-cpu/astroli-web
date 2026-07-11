import { supabaseAdmin } from './supabase-server';

export interface AuthTokenResult {
  authUserId: string;
  /** Single-use magic-link token hash — exchanged for a session via verifyOtp
   *  (web: client-side; mobile: POST /api/auth/session). */
  authToken: string;
}

/**
 * Ensures a Supabase auth user exists for `email`, syncs their role metadata,
 * and issues a single-use sign-in token.
 *
 * generateLink is idempotent: it finds the existing auth user by exact email,
 * or creates one if none exists, and returns both the hashed_token (for
 * verifyOtp) and the user's UUID — no separate createUser/findByEmail needed.
 *
 * The explicit updateUserById is required because generateLink's options.data
 * does NOT reliably update raw_user_meta_data for EXISTING auth users (it only
 * embeds the data in the token). IMPORTANT: pass ONLY user_metadata — never
 * email_confirm: true, which clears confirmation_token in auth.users and
 * invalidates hashed_token, making verifyOtp 403 (previous bug).
 *
 * @param logPrefix route name used in error logs, e.g. 'identify'
 */
export async function upsertAuthUserAndToken(
  email: string,
  metadata: { role: string; student_id?: string | null; teacher_id?: string | null; [key: string]: unknown },
  logPrefix: string,
): Promise<AuthTokenResult | null> {
  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type:    'magiclink',
    email,
    options: { data: metadata },
  });
  if (linkError || !link) {
    console.error(`[${logPrefix}] generateLink`, linkError);
    return null;
  }

  const hashed_token = (link.properties as { hashed_token?: string }).hashed_token;
  const authUserId   = (link as { user?: { id?: string } }).user?.id;

  if (!hashed_token || !authUserId) {
    console.error(`[${logPrefix}] generateLink missing token or user id`);
    return null;
  }

  const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    user_metadata: metadata,
  });
  if (metaErr) console.error(`[${logPrefix}] updateUserById user_metadata failed:`, metaErr);

  return { authUserId, authToken: hashed_token };
}
