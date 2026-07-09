// GET /api/parent/dashboard/progress
//
// Returns the linked child's full mission/planet progress, including
// per-goal Q&A — the parent-facing equivalent of the teacher drill-down.
// Fetched lazily (only when the parent opens "Review progress"), since the
// main dashboard load should stay fast per the dashboard's own contract.
//
// Response: 200 DrillDownResponse
//           401 — no session
//           403 — not a parent session, or parent has no linked child
//           404 — child not enrolled in any family class

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId, getParentContext } from '@/lib/parent-auth';
import { getStudentDrillDown } from '@/lib/drill-down';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const { childId } = await getParentContext(parentId);
  if (!childId) {
    return NextResponse.json({ error: 'No child linked to this account' }, { status: 403 });
  }

  // The family's class row stores teacher_id = parentId (see getParentContext),
  // so this is the same ownerId-scoped query the teacher drill-down uses —
  // it naturally scopes to the parent's own child, nothing else.
  try {
    const result = await getStudentDrillDown(parentId, childId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('[parent/dashboard/progress] getStudentDrillDown failed', err);
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}
