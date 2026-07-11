import { NextResponse } from 'next/server';
import type { Session } from '@supabase/supabase-js';

/**
 * Shape of the session payload returned to mobile clients by
 * /api/auth/session and /api/auth/refresh. The access token goes in the
 * `Authorization: Bearer` header on protected calls; expiresAt (unix seconds)
 * tells the client when to refresh.
 */
export function mobileSessionResponse(session: Session | null): NextResponse {
  if (!session?.access_token || !session.refresh_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    accessToken:  session.access_token,
    refreshToken: session.refresh_token,
    expiresAt:    session.expires_at ?? null,
  });
}
