import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, assertStudentSession } from '@/lib/auth';

// GET /api/home
//
// Returns the journeys the authenticated student is enrolled in, each with
// its missions.
//
// The ?studentId= query param is intentionally ignored — identity comes from
// the verified session cookie only.
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertStudentSession(auth.user);
  if (sessionError) return sessionError;

  const studentId = auth.user.user_metadata.student_id as string;

  try {
    // Fetch journey IDs the student is enrolled in.
    const { data: enrollments, error: eErr } = await supabaseAdmin
      .from('student_journeys')
      .select('journey_id')
      .eq('student_id', studentId);

    if (eErr) throw eErr;

    const journeyIds = (enrollments ?? []).map((e) => e.journey_id);

    if (journeyIds.length === 0) {
      return NextResponse.json({ journeys: [] });
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
