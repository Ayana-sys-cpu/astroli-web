import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';

// ── GET /api/student/me ───────────────────────────────────────────────────────
// Returns the authenticated student's DB user_id. Exists as the client-side
// fallback for sessions whose JWT was minted before user_metadata.student_id
// was backfilled — resolveStudentIdFromRequest falls back to a DB lookup and
// self-heals the auth metadata, so a follow-up token refresh on the client
// picks up the healed value.

export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ studentId });
}
