// GET /api/admin/students
//
// Unified pilot roster for the founder: every enrolled student across school
// AND family classes, deduped. Founder-only (ADMIN_EMAIL).
// Contract: specs/founder/web-app/pilot-review-dashboard/contracts/admin-api.md

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { buildPilotRoster } from '@/lib/pilot-roster';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const students = await buildPilotRoster();
    return NextResponse.json({ students });
  } catch (error) {
    console.error('[admin/students] roster assembly failed', error);
    return NextResponse.json({ error: 'Roster assembly failed' }, { status: 500 });
  }
}
