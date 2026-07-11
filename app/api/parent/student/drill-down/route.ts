// GET /api/parent/student/drill-down
//
// Returns the linked child's full learning progress in DrillDownResponse shape.
// Identical to GET /api/teacher/students/:id/drill-down but scoped to the
// parent's linked child — no student ID in the URL, child resolved from auth.
//
// Response: 200 DrillDownResponse
//           401 — no session
//           403 — not a parent session, or parent has no linked child

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

  const result = await getStudentDrillDown(parentId, childId);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
