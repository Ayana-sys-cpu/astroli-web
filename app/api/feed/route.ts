import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { scoreCandidates } from '@/lib/feed-scoring';
import type { FeedEdit, StudentContext } from '@/lib/feed-scoring';

const BATCH_SIZE = 12;

export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const afterId = req.nextUrl.searchParams.get('after_id');

  try {
    // Resolve student's active planet and journey
    const { data: classData } = await supabaseAdmin
      .from('student_classes')
      .select('class_id')
      .eq('student_id', studentId);

    const classIds = (classData ?? []).map((c: { class_id: string }) => c.class_id);

    let activePlanetId: string | null = null;
    let journeyPlanetIds: string[] = [];

    if (classIds.length > 0) {
      // Find the active mission for each class
      const { data: missionStates } = await supabaseAdmin
        .from('class_mission_state')
        .select('class_id, mission_id, state')
        .in('class_id', classIds)
        .eq('state', 'active');

      const activeMissionId = missionStates?.[0]?.mission_id ?? null;

      if (activeMissionId) {
        // Get all planets in this mission (active planet = first active planet)
        const { data: missionPlanets } = await supabaseAdmin
          .from('planets')
          .select('id, "order"')
          .eq('mission_id', activeMissionId)
          .order('order', { ascending: true });

        journeyPlanetIds = (missionPlanets ?? []).map((p: { id: string }) => p.id);
        activePlanetId = journeyPlanetIds[0] ?? null;

        // Get all missions in the same journey to expand pool if needed
        const { data: classInfo } = await supabaseAdmin
          .from('classes')
          .select('journey_id')
          .in('id', classIds)
          .limit(1)
          .single();

        if (classInfo?.journey_id) {
          const { data: allMissions } = await supabaseAdmin
            .from('missions')
            .select('id')
            .eq('journey_id', classInfo.journey_id);

          if (allMissions && allMissions.length > 0) {
            const allMissionIds = allMissions.map((m: { id: string }) => m.id);
            const { data: allPlanets } = await supabaseAdmin
              .from('planets')
              .select('id')
              .in('mission_id', allMissionIds);
            journeyPlanetIds = (allPlanets ?? []).map((p: { id: string }) => p.id);
          }
        }
      }
    }

    // Load student's interest theme
    const { data: studentData } = await supabaseAdmin
      .from('students')
      .select('interests')
      .eq('id', studentId)
      .maybeSingle();

    const interestTheme: string | null =
      (studentData as any)?.interests?.[0] ?? null;

    // Load all seen edit IDs for this student
    const { data: seenEvents } = await supabaseAdmin
      .from('feed_events')
      .select('edit_id')
      .eq('student_id', studentId)
      .eq('action', 'impression');

    const seenEditIds = new Set(
      (seenEvents ?? []).map((e: { edit_id: string }) => e.edit_id),
    );

    // If after_id provided, also exclude everything up to and including it
    if (afterId) seenEditIds.add(afterId);

    // Load engagement counts per type for scoring
    const { data: engagementEvents } = await supabaseAdmin
      .from('feed_events')
      .select('edit_id, action')
      .eq('student_id', studentId)
      .in('action', ['like', 'task_done', 'learn_more']);

    const engagementCounts = { did_you_know: 0, inspiring_human: 0, real_world_task: 0 };

    if (engagementEvents && engagementEvents.length > 0) {
      const editIds = Array.from(new Set<string>(engagementEvents.map((e: any) => e.edit_id as string)));
      if (editIds.length > 0) {
        const { data: editTypes } = await supabaseAdmin
          .from('feed_edits')
          .select('id, edit_type')
          .in('id', editIds);

        for (const edit of editTypes ?? []) {
          const key = edit.edit_type as keyof typeof engagementCounts;
          if (key in engagementCounts) engagementCounts[key]++;
        }
      }
    }

    // Load live edit candidates from the journey's planets
    const planetIds = journeyPlanetIds.length > 0 ? journeyPlanetIds : [];

    const { data: candidates } = await supabaseAdmin
      .from('feed_edits')
      .select('id, edit_type, planet_id, interest_theme, hook, body, bridge, media_url, media_type, media_credit')
      .eq('status', 'live')
      .in('planet_id', planetIds.length > 0 ? planetIds : ['__none__']);

    const ctx: StudentContext = {
      activePlanetId,
      interestTheme,
      seenEditIds,
      engagementCounts,
    };

    const scored = scoreCandidates((candidates ?? []) as FeedEdit[], ctx);
    const batch = scored.slice(0, BATCH_SIZE);
    const hasMore = scored.length > BATCH_SIZE;

    return NextResponse.json({ edits: batch, has_more: hasMore });
  } catch (err) {
    console.error('[GET /api/feed]', err);
    return NextResponse.json({ edits: [], has_more: false });
  }
}
