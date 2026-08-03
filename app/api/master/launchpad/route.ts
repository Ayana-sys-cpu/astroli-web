import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { pickEditPerTier, type LaunchpadTier, type SpotlightCandidate } from '@/lib/spotlight-ranking';
import { buildPlace } from '@/lib/student-place';

const EDIT_FIELDS = 'id, edit_type, planet_id, interest_theme, hook, media_url, media_type, media_credit, created_at';

export interface LaunchpadCard {
  id: string;
  hook: string;
  tier: LaunchpadTier;
}

/**
 * Four openings for a student whose Master shelf is empty — one from the planet
 * they are on, one ahead, one behind, one from another journey entirely.
 *
 * Four angles beat four variations on one topic: an empty state gets a single
 * chance to catch someone, and the student who shrugs at volcanoes may still
 * bite on the ocean floor.
 *
 * Unlike the home curiosity panel this carries no allowlist — it replaces a
 * dead end, so gating it would leave most students staring at the very screen
 * this exists to remove.
 *
 * Read-only: no impression is recorded, so the launchpad never quietly consumes
 * feed content or collects anything new about the student.
 */
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [classRows, completedRows, studentRow, seenRows, editRows] = await Promise.all([
      supabaseAdmin.from('student_classes').select('class_id').eq('student_id', studentId),
      supabaseAdmin.from('planet_session_state').select('planet_id').eq('student_id', studentId).eq('completed', true),
      supabaseAdmin.from('students').select('interests').eq('id', studentId).maybeSingle(),
      supabaseAdmin.from('feed_events').select('edit_id').eq('student_id', studentId).eq('action', 'impression'),
      supabaseAdmin.from('feed_edits').select(EDIT_FIELDS).eq('status', 'live'),
    ]);

    const place = await buildPlace({
      classIds: (classRows.data ?? []).map((c: { class_id: string }) => c.class_id),
      completedPlanetIds: new Set((completedRows.data ?? []).map((r: { planet_id: string }) => r.planet_id)),
      interests: (studentRow.data as { interests?: unknown } | null)?.interests,
      seenEditIds: new Set((seenRows.data ?? []).map((e: { edit_id: string }) => e.edit_id)),
    });

    const cards: LaunchpadCard[] = pickEditPerTier(
      (editRows.data ?? []) as SpotlightCandidate[],
      place,
    ).map(({ edit, tier }) => ({ id: edit.id, hook: edit.hook, tier }));

    return NextResponse.json({ cards });
  } catch {
    // Absence beats an error here — the search bar alone is still a correct screen.
    return NextResponse.json({ cards: [] });
  }
}
