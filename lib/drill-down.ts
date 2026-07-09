// Shared per-student progress drill-down logic.
//
// Used by:
// - GET /api/teacher/students/[studentId]/drill-down (ownerId = teacherId)
// - GET /api/parent/dashboard/progress (ownerId = parentId — the family's
//   single class row stores teacher_id = parentId, so the same
//   ownerId-scoped Prisma query naturally scopes to the parent's own child)
//
// Extracted verbatim from the teacher drill-down route so both callers stay
// in sync — there is exactly one place that defines what "progress" means.

import { supabaseAdmin } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { generateSignalsBatch } from '@/lib/signals';
import type {
  DrillDownResponse,
  SubjectSummary,
  GoalSummary,
  PlanetStatus,
  MissionMeta,
  CrossJourneyStats,
  PerformanceInfo,
} from '@/lib/drill-down-types';
import { toPerkinsLevel, performanceLabel } from '@/lib/drill-down-types';

type UserRow = { full_name: string | null; first_name: string | null } | null;

function toInitials(name: string): string {
  return (name.trim() || 'S')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export async function getStudentDrillDown(
  ownerId: string,
  studentId: string,
): Promise<DrillDownResponse | { error: string; status: number }> {
  const sharedClasses = await prisma.class.findMany({
    where: {
      teacherId: ownerId,
      studentJourneys: { some: { student_id: studentId } },
    },
    select: {
      id: true,
      title: true,
      journey: {
        select: {
          missions: {
            orderBy: { mission_order: 'asc' },
            select: {
              id: true,
              question: true,
              mission_order: true,
              planets: {
                orderBy: { createdAt: 'asc' },
                select: { id: true, title: true },
              },
            },
          },
        },
      },
      classMissionState: {
        select: { missionId: true, state: true },
      },
    },
    orderBy: { title: 'asc' },
  });

  if (sharedClasses.length === 0) {
    return { error: 'Student not found or not enrolled in any of your journeys.', status: 404 };
  }

  const sharedJourneys = sharedClasses.map(c => {
    const stateByMission = new Map(c.classMissionState.map(s => [s.missionId, s.state]));
    return {
      id:    c.id,
      title: c.title,
      missions: c.journey.missions.map(m => ({
        id:            m.id,
        question:      m.question,
        mission_order: m.mission_order,
        state:         stateByMission.get(m.id) ?? 'locked',
        planets:       m.planets,
      })),
    };
  });

  const { data: studentRow, error: studentError } = await supabaseAdmin
    .from('users')
    .select('id, full_name, first_name')
    .eq('id', studentId)
    .single();

  if (studentError && studentError.code !== 'PGRST116') {
    return { error: 'Failed to fetch student profile.', status: 500 };
  }

  const profile = studentRow as UserRow;
  const name = profile?.full_name || profile?.first_name || 'Student';
  const firstName = profile?.first_name || name.split(' ')[0] || 'Student';

  const planetIds: string[] = sharedJourneys.flatMap((j) =>
    j.missions.flatMap((m) => m.planets.map((p) => p.id)),
  );

  const summaries = await prisma.planetSummary.findMany({
    where: { studentId, planetId: { in: planetIds } },
    include: { goals: { orderBy: { createdAt: 'asc' } } },
  });

  const summaryByPlanetId = new Map(summaries.map((s) => [s.planetId, s]));

  // status is no longer a planet_summaries column — a row there only exists once a
  // planet is completed. In-progress state lives in planet_session_state instead
  // (same table/pattern used by lib/signals.ts and the student planet-summaries route).
  const { data: sessionRows } = await supabaseAdmin
    .from('planet_session_state')
    .select('planet_id, completed')
    .eq('student_id', studentId)
    .in('planet_id', planetIds);

  const sessionByPlanetId = new Map(
    (sessionRows ?? []).map((r) => [(r as any).planet_id as string, (r as any).completed as boolean]),
  );

  // planet_summary_goals only stores a teaching_goal_id FK, not a title — resolve a
  // readable title by joining planet_teaching_goals, same pattern as lib/signals.ts.
  const teachingGoalIds = Array.from(
    new Set(summaries.flatMap((s) => s.goals.map((g) => g.teachingGoalId).filter((id): id is string => !!id))),
  );

  const { data: teachingGoalRows } = teachingGoalIds.length
    ? await supabaseAdmin.from('planet_teaching_goals').select('id, description').in('id', teachingGoalIds)
    : { data: [] as { id: string; description: string }[] };

  const teachingGoalDescriptionById = new Map(
    (teachingGoalRows ?? []).map((r) => [(r as any).id as string, (r as any).description as string]),
  );

  const activeMissionByJourney: Record<string, string> = {};
  const missionsByJourney: Record<string, MissionMeta[]> = {};

  for (const journey of sharedJourneys) {
    const activeMission = journey.missions.find((m) => m.state === 'active');
    activeMissionByJourney[journey.id] = activeMission?.id ?? '';
    missionsByJourney[journey.id] = journey.missions.map((m) => ({
      id: m.id,
      title: m.question,
      order: m.mission_order,
      state: m.state ?? 'pending',
    }));
  }

  const subjects: SubjectSummary[] = [];

  for (const journey of sharedJourneys) {
    for (const mission of journey.missions) {
      for (const planet of mission.planets) {
        const summary = summaryByPlanetId.get(planet.id);

        const goals: GoalSummary[] = (summary?.goals ?? []).map((g, i) => ({
          id: g.id,
          displayTitle:
            g.termName ??
            (g.teachingGoalId ? teachingGoalDescriptionById.get(g.teachingGoalId) : undefined) ??
            `Goal ${i + 1}`,
          termName: g.termName,
          insightText: g.insightText,
          conversationEvidence: g.conversationEvidence,
          studentAddition: g.studentAddition,
          performance: { level: toPerkinsLevel(g.perkinsLevelDemonstrated), isGraceCompletion: false },
        }));

        const missionPending = mission.state !== 'active' && mission.state !== 'completed';
        let storedStatus: PlanetStatus;
        if (summary) {
          storedStatus = 'completed';
        } else if (sessionByPlanetId.has(planet.id)) {
          storedStatus = sessionByPlanetId.get(planet.id) ? 'completed' : 'in_progress';
        } else {
          storedStatus = 'not_started';
        }
        const resolvedStatus: PlanetStatus = missionPending ? 'pending_activation' : storedStatus;

        const performance: PerformanceInfo | null = summary
          ? {
              level: toPerkinsLevel(summary.highestPerkinsLevelDemonstrated),
              isGraceCompletion: summary.completionType === 'grace',
            }
          : null;

        subjects.push({
          planetId: planet.id,
          planetTitle: planet.title,
          missionId: mission.id,
          missionTitle: mission.question,
          missionOrder: mission.mission_order,
          journeyId: journey.id,
          journeyTitle: journey.title,
          status: resolvedStatus,
          performance,
          completedAt: summary?.completedAt?.toISOString() ?? null,
          goals,
          teachingGoalCount: goals.length,
        });
      }
    }
  }

  const signalByJourney: Record<string, import('@/lib/signals').SignalType | null> = {};
  const batchResults = await generateSignalsBatch(
    sharedJourneys.map((journey) => ({
      journeyId:    journey.id,
      missionIds:   journey.missions.map((m) => m.id),
      lastSessionAt: null,
    })),
  );
  for (const [journeyId, signals] of Array.from(batchResults.entries())) {
    const studentSignal = signals.find((s) => s.studentId === studentId);
    signalByJourney[journeyId] = studentSignal?.signalType ?? null;
  }

  let peakLevel = -1;
  let peakPerformance: PerformanceInfo | null = null;
  let peakJourneyTitle: string | null = null;
  let activeMissionsCount = 0;
  let totalMissionsCount = 0;

  for (const journey of sharedJourneys) {
    for (const mission of journey.missions) {
      totalMissionsCount++;
      if (mission.state === 'active') activeMissionsCount++;
    }
  }

  for (const subject of subjects) {
    // Grace completions don't reflect a demonstrated Perkins level — excluded from peak.
    if (subject.performance?.level && !subject.performance.isGraceCompletion) {
      if (subject.performance.level > peakLevel) {
        peakLevel = subject.performance.level;
        peakPerformance = subject.performance;
        peakJourneyTitle = subject.journeyTitle;
      }
    }
  }

  let weeklyExplorationChangePercent: number | null = null;
  try {
    const allMissionIds = sharedJourneys.flatMap((j) => j.missions.map((m) => m.id));
    const now = Date.now();
    const thisWeekStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const lastWeekStart = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [thisWeekResult, lastWeekResult] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .in('mission_id', allMissionIds)
        .gte('created_at', thisWeekStart),
      supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .in('mission_id', allMissionIds)
        .gte('created_at', lastWeekStart)
        .lt('created_at', thisWeekStart),
    ]);

    const thisWeek = thisWeekResult.count ?? 0;
    const lastWeek = lastWeekResult.count ?? 0;

    if (lastWeek > 0) {
      weeklyExplorationChangePercent = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    } else if (thisWeek > 0) {
      weeklyExplorationChangePercent = 100;
    }
  } catch {
    // Non-critical — leave as null
  }

  const crossJourneyStats: CrossJourneyStats = {
    peakPerformance,
    peakJourneyTitle,
    activeMissionsCount,
    totalMissionsCount,
    weeklyExplorationChangePercent,
  };

  const SIGNAL_PRIORITY: Record<string, number> = { non_engagement: 4, grace_completion: 3, stuck: 2, breakthrough: 1 };
  let dominantSignal: string | null = null;
  let dominantPriority = -1;
  for (const signal of Object.values(signalByJourney)) {
    if (signal) {
      const p = SIGNAL_PRIORITY[signal] ?? 0;
      if (p > dominantPriority) { dominantPriority = p; dominantSignal = signal; }
    }
  }

  const peakLabel = peakPerformance ? performanceLabel(peakPerformance) : null;
  let prewrittenMessage: string;
  if (dominantSignal === 'non_engagement') {
    prewrittenMessage = `Hi ${firstName}, just thinking of you — noticed you haven't been around lately. Everything okay? I'm here if you need anything 🌟`;
  } else if (dominantSignal === 'grace_completion') {
    prewrittenMessage = `Hi ${firstName}! I saw you worked through the last planet. I'd love to find 5 minutes to chat about it — I think there's a cool angle we haven't explored yet 🌟`;
  } else if (dominantSignal === 'stuck') {
    prewrittenMessage = `Hi ${firstName} — I can see you've been spending real time on this. I have a feeling you're closer to the big idea than you think. Want a nudge? 🌟`;
  } else if (peakLabel && peakJourneyTitle) {
    prewrittenMessage = `Hi ${firstName}! I just wanted to let you know that I noticed your great work in ${peakJourneyTitle} — reaching ${peakLabel} level is something to be proud of. Keep it up! 🌟`;
  } else {
    prewrittenMessage = `Hi ${firstName}! Just a quick note to say I see how hard you're working. Keep exploring and don't hesitate to ask me if anything feels tricky! 🌟`;
  }

  return {
    student: {
      id: studentId,
      name,
      initials: toInitials(name),
      grade: null,
      journeyEnrollments: sharedJourneys.map((j) => ({ journeyId: j.id, title: j.title })),
    },
    subjects,
    journeys: sharedJourneys.map((j) => ({ id: j.id, title: j.title })),
    activeMissionByJourney,
    missionsByJourney,
    signalByJourney,
    crossJourneyStats,
    prewrittenMessage,
  };
}
