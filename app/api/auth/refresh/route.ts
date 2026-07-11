// POST /api/auth/refresh
//
// Public. Rotates a mobile client's refresh token into a fresh session.
// Called on app start and whenever the access token nears expiry.
//
// Request:  POST { refreshToken: string }
// Response: { accessToken, refreshToken, expiresAt } | 401

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAnon } from '@/lib/supabase-server';
import { mobileSessionResponse } from '@/lib/mobile-session';
import { parseBody, z } from '@/lib/validate';

const RefreshSchema = z.object({ refreshToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, RefreshSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await supabaseAnon.auth.refreshSession({
    refresh_token: parsed.data.refreshToken,
  });
  if (error) {
    console.error('[auth/refresh] refreshSession failed:', error.message);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return mobileSessionResponse(data.session);
}
