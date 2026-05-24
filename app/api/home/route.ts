import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/home?studentId=<uuid>
//
// Returns the journeys this student is enrolled in, each with its missions.
// If studentId is omitted (legacy callers) falls back to returning all journeys
// that have at least one non-locked mission — preserving backwards compatibility
// until all clients are updated.
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get('studentId');

    let journeyIds: string[];

    if (studentId) {
      // ── Enrolled path: student sees only their own journeys ──────────────
      const { data: enrollments, error: eErr } = await supabaseAdmin
        .from('student_journeys')
        .select('journey_id')
        .eq('student_id', studentId);

      if (eErr) throw eErr;

      journeyIds = (enrollments ?? []).map((e) => e.journey_id);

      if (journeyIds.length === 0) {
        return NextResponse.json({ journeys: [] });
      }
    } else {
      // ── Legacy fallback: return all journeys with an activated mission ────
      const { data: missionRows, error: mErr } = await supabaseAdmin
        .from('missions')
        .select('journey_id')
        .neq('state', 'locked');

      if (mErr) throw mErr;

      journeyIds = Array.from(new Set((missionRows ?? []).map((m) => m.journey_id)));

      if (journeyIds.length === 0) {
        return NextResponse.json({ journeys: [] });
      }
    }

    // Fetch the journeys with all their missions (all states — UI handles display).
    const { data: rows, error: jErr } = await supabaseAdmin
      .from('journeys')
      .select('id, title, vote_ends_at, missions(id, question, state, mission_order)')
      .in('id', journeyIds);

    if (jErr) throw jErr;

    const journeys = (rows ?? []).map((j) => ({
      id: j.id,
      title: j.title,
      voteEndsAt: j.vote_ends_at,
      missions: ((j.missions as any[]) ?? [])
        .sort((a, b) => a.mission_order - b.mission_order)
        .map((m) => ({
          id: m.id,
          question: m.question,
          state: m.state,
          order: m.mission_order,
        })),
    }));

    return NextResponse.json({ journeys });
  } catch (err) {
    console.error('[GET /api/home]', err);
    return NextResponse.json({ journeys: [] });
  }
}
