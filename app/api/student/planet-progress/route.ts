import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';

// GET /api/student/planet-progress?missionId=<uuid>
// Returns per-planet goal progress for the authenticated student.
// Reads from planet_session_state and planet_teaching_goals (bot tables, same Supabase project).
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const missionId = req.nextUrl.searchParams.get('missionId');
  if (!missionId) return NextResponse.json({ error: 'missionId required' }, { status: 400 });

  const { data: planetRows } = await supabaseAdmin
    .from('planets')
    .select('id')
    .eq('mission_id', missionId);

  if (!planetRows?.length) return NextResponse.json({ error: 'Mission not found' }, { status: 404 });

  const planetIds = planetRows.map((p: { id: string }) => p.id);

  const [goalResult, sessionResult] = await Promise.all([
    supabaseAdmin
      .from('planet_teaching_goals')
      .select('planet_id')
      .in('planet_id', planetIds),
    supabaseAdmin
      .from('planet_session_state')
      .select('planet_id, perkins_map, completed')
      .eq('student_id', studentId)
      .in('planet_id', planetIds),
  ]);

  const goalCountMap: Record<string, number> = {};
  for (const row of goalResult.data ?? []) {
    goalCountMap[row.planet_id] = (goalCountMap[row.planet_id] ?? 0) + 1;
  }

  const sessionMap: Record<string, { perkins_map: Record<string, number | null>; completed: boolean }> = {};
  for (const row of sessionResult.data ?? []) {
    sessionMap[row.planet_id] = {
      perkins_map: (row.perkins_map as Record<string, number | null>) ?? {},
      completed: row.completed ?? false,
    };
  }

  const progress: Record<string, { goalsDiscovered: number; totalGoals: number; completed: boolean }> = {};
  for (const planetId of planetIds) {
    const session = sessionMap[planetId];
    const totalGoals = goalCountMap[planetId] ?? 0;
    const goalsDiscovered = session
      ? Object.values(session.perkins_map).filter(v => v !== null).length
      : 0;
    progress[planetId] = {
      goalsDiscovered,
      totalGoals,
      completed: session?.completed ?? false,
    };
  }

  return NextResponse.json({ progress });
}
