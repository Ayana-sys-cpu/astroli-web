import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import type { EditType } from '@/lib/feed-scoring';
import { pickEdit, type SpotlightCandidate } from '@/lib/spotlight-ranking';
import { buildPlace } from '@/lib/student-place';

const EDIT_FIELDS = 'id, edit_type, planet_id, interest_theme, hook, media_url, media_type, media_credit, created_at';

export interface SpotlightEdit {
  id: string;
  edit_type: EditType;
  hook: string;
  media_url: string;
  media_type: 'image' | 'video';
  media_credit: string;
}

/**
 * Comma-separated emails allowed to see the panel while it is behind the flag.
 * Unset = nobody sees it. Remove the gate to launch it to every student.
 */
function isAllowed(email: string | null): boolean {
  if (!email) return false;
  const allowlist = (process.env.CURIOSITY_PANEL_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

/**
 * One edit for the home curiosity panel — the doorway into Master.
 *
 * Every published edit is a candidate, so the panel is never empty; what
 * changes is the order. Fresh content first, then closeness to where the
 * student is (the planet they are on, then ones they finished, then ones ahead
 * of them, then other journeys entirely), then their declared interest, then
 * recency.
 *
 * The student sits waiting on this, so it costs two round trips: everything
 * that can be asked at once is, and only the journey shape has to wait on
 * which classes they are in.
 *
 * Read-only by design — no impression is recorded, so the panel never silently
 * consumes feed content and collects nothing about the student.
 */
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [email, classRows, completedRows, studentRow, seenRows, editRows] = await Promise.all([
      supabaseAdmin.from('users').select('email').eq('id', studentId).maybeSingle(),
      supabaseAdmin.from('student_classes').select('class_id').eq('student_id', studentId),
      supabaseAdmin.from('planet_session_state').select('planet_id').eq('student_id', studentId).eq('completed', true),
      supabaseAdmin.from('students').select('interests').eq('id', studentId).maybeSingle(),
      supabaseAdmin.from('feed_events').select('edit_id').eq('student_id', studentId).eq('action', 'impression'),
      supabaseAdmin.from('feed_edits').select(EDIT_FIELDS).eq('status', 'live'),
    ]);

    if (!isAllowed((email.data as { email?: string | null } | null)?.email ?? null)) {
      return NextResponse.json({ enabled: false, edit: null });
    }

    const place = await buildPlace({
      classIds: (classRows.data ?? []).map((c: { class_id: string }) => c.class_id),
      completedPlanetIds: new Set((completedRows.data ?? []).map((r: { planet_id: string }) => r.planet_id)),
      interests: (studentRow.data as { interests?: unknown } | null)?.interests,
      seenEditIds: new Set((seenRows.data ?? []).map((e: { edit_id: string }) => e.edit_id)),
    });

    const top = pickEdit((editRows.data ?? []) as SpotlightCandidate[], place);
    if (!top) return NextResponse.json({ enabled: true, edit: null });

    const edit: SpotlightEdit = {
      id: top.id,
      edit_type: top.edit_type,
      hook: top.hook,
      media_url: top.media_url,
      media_type: top.media_type,
      media_credit: top.media_credit,
    };
    return NextResponse.json({ enabled: true, edit });
  } catch {
    // The panel's empty state is always a correct screen — never fail the home page.
    return NextResponse.json({ enabled: true, edit: null });
  }
}
