// PATCH  /api/admin/feedback/[id] — partial update (status/content/source/student/tags/notes)
// DELETE /api/admin/feedback/[id] — permanent delete (founder-only tool, pilot scale)
//
// Founder feedback log (spec: specs/founder/web-app/pilot-review-dashboard).
// Contract: contracts/admin-api.md.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { parseBody } from '@/lib/validate';
import { UpdateFeedbackBody, toFeedbackEntry, type FeedbackRow } from '@/lib/founder-feedback';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, UpdateFeedbackBody);
  if (!parsed.ok) return parsed.response;
  const { studentId, source, content, status, tags, actionNotes } = parsed.data;

  const patch: Record<string, unknown> = {};
  if (studentId !== undefined) patch.student_id = studentId;
  if (source !== undefined) patch.source = source;
  if (content !== undefined) patch.content = content;
  if (status !== undefined) patch.status = status;
  if (tags !== undefined) patch.tags = tags;
  if (actionNotes !== undefined) patch.action_notes = actionNotes;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from('founder_feedback')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error('[admin/feedback] update failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Feedback entry not found' }, { status: 404 });
  }

  return NextResponse.json({ feedback: toFeedbackEntry(row as FeedbackRow) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { error } = await supabaseAdmin
    .from('founder_feedback')
    .delete()
    .eq('id', params.id);

  if (error) {
    console.error('[admin/feedback] delete failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
