// POST /api/auth/session
//
// Public. Exchanges the single-use magic-link token hash (`authToken`,
// issued by /api/auth/identify, /api/auth/google, or /api/auth/student-status)
// for a real Supabase session. Mobile clients call this once after sign-in,
// then authenticate protected /api routes with `Authorization: Bearer
// <accessToken>` — never with a bare student id.
//
// Request:  POST { authToken: string }
// Response: { accessToken, refreshToken, expiresAt } | 401

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAnon } from '@/lib/supabase-server';
import { mobileSessionResponse } from '@/lib/mobile-session';
import { parseBody, z } from '@/lib/validate';

const SessionSchema = z.object({ authToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, SessionSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await supabaseAnon.auth.verifyOtp({
    type:       'magiclink',
    token_hash: parsed.data.authToken,
  });
  if (error) {
    console.error('[auth/session] verifyOtp failed:', error.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return mobileSessionResponse(data.session);
}
