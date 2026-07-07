import { requireAuth } from './auth';
import { NextResponse } from 'next/server';

/**
 * Verifies the session user is the founder admin (email matches ADMIN_EMAIL env var).
 * Returns { ok: true, user } or a NextResponse error.
 */
export async function requireAdmin(): Promise<
  { ok: true; user: any } | { ok: false; response: NextResponse }
> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Admin not configured' }, { status: 503 }),
    };
  }

  const userEmail = auth.user.email as string | undefined;
  if (!userEmail || userEmail.toLowerCase() !== adminEmail.toLowerCase()) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, user: auth.user };
}
