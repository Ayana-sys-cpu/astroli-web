// src/astroli-web/app/api/teacher/students/[studentId]/drill-down/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
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
  PerformanceType,
} from '@/lib/drill-down-types';
import { toPerformanceType, performanceLabel } from '@/lib/drill-down-types';

type UserRow = { full_name: string | null; first_name: string | null } | null;

function toInitials(name: string): string {
  return (name.trim() || 'S')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const PERKINS_RANK: Record<string, number> = {
  grace_completion: 0,
  explaining: 1,
  mustering_evidence: 2,
  finding_examples: 3,
  generalizing: 4,
  applying_concepts: 5,
  analogizing: 6,
  representing_in_new_ways: 7,
  considering_alternatives: 8,
  actionable_extrapolation: 9,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { studentId: string } },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;
  const { studentId } = params;

  // 1. Fetch all teacher classes this student is enrolled in. Missions come
  // from the template (journey relation), never duplicated; this class's
  // live state comes from classMissionState. The rest of this file keeps
  // calling these "journeys" (variable names, response field names) since
  // that's the wire-format contract the frontend already expects — see
  // docs/architecture/2026-06-16-journeys-classes-redesign.md.
  const sharedClasses = await prisma.class.findMany({
    where: {
      teacherId,
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
    return NextResponse.json(
      { error: 'Student not found or not enrolled in any of your journeys.' },
      { status: 404 },
    );
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

  // 2. Fetch student profile
  const { data: studentRow, error: studentError } = await supabaseAdmin
    .from('users')
    .select('id, full_name, first_name')
    .eq('id', studentId)
    .single();

  if (studentError && studentError.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Failed to fetch student profile.' }, { status: 500 });
  }

  const profile = studentRow as UserRow;
  const name = profile?.full_name || profile?.first_name || 'Student';
  const firstName = profile?.first_name || name.split(' ')[0] || 'Student';

  // 3. Collect all planet IDs
  const planetIds: string[] = sharedJourneys.flatMap((j) =>
    j.missions.flatMap((m) => m.planets.map((p) => p.id)),
  );

  // 4. Fetch planet_summaries with goals
  const summaries = await prisma.planetSummary.findMany({
    where: { studentId, planetId: { in: planetIds } },
    include: { goals: { orderBy: { createdAt: 'asc' } } },
  });

  const summaryByPlanetId = new Map(summaries.map((s) => [s.planetId, s]));

  // 5. Build per-journey helpers
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

  // 6. Build subject list
  const subjects: SubjectSummary[] = [];

  for (const journey of sharedJourneys) {
    for (const mission of journey.missions) {
      for (const planet of mission.planets) {
        const summary = summaryByPlanetId.get(planet.id);

        const goals: GoalSummary[] = (summary?.goals ?? []).map((g) => ({
          id: g.id,
          goalTitle: g.goalTitle,
          performanceType: toPerformanceType(g.performanceType),
          botQuestion: g.botQuestion,
          studentAnswer: g.studentAnswer,
        }));

        const missionPending = mission.state !== 'active' && mission.state !== 'completed';
        const storedStatus = (summary?.status as PlanetStatus | undefined) ?? 'not_started';
        const resolvedStatus: PlanetStatus = missionPending ? 'pending_activation' : storedStatus;

        subjects.push({
          planetId: planet.id,
          planetTitle: planet.title,
          missionId: mission.id,
          missionTitle: mission.question,
          missionOrder: mission.mission_order,
          journeyId: journey.id,
          journeyTitle: journey.title,
          status: resolvedStatus,
          performanceType: toPerformanceType(summary?.performanceType),
          assessedAt: summary?.assessedAt?.toISOString() ?? null,
          goals,
          teachingGoalCount: goals.length,
        });
      }
    }
  }

  // 7. Signals — batch across all shared journeys instead of one query per journey.
  // journey.id is a class id here, so missionIds must be passed explicitly —
  // generateSignalsBatch only auto-resolves missions by journey_id when
  // missionIds is omitted, which would find nothing for a class id.
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

  // 8. Cross-journey stats
  let peakRank = -1;
  let peakPerformanceType: PerformanceType | null = null;
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
    if (subject.performanceType) {
      const rank = PERKINS_RANK[subject.performanceType] ?? -1;
      if (rank > peakRank) {
        peakRank = rank;
        peakPerformanceType = subject.performanceType;
        peakJourneyTitle = subject.journeyTitle;
      }
    }
  }

  // Weekly exploration change — message counts this week vs last week
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
    peakPerformanceType,
    peakJourneyTitle,
    activeMissionsCount,
    totalMissionsCount,
    weeklyExplorationChangePercent,
  };

  // 9. Pre-written WhatsApp message — matched to the student's dominant signal
  const SIGNAL_PRIORITY: Record<string, number> = { non_engagement: 4, grace_completion: 3, stuck: 2, breakthrough: 1 };
  let dominantSignal: string | null = null;
  let dominantPriority = -1;
  for (const signal of Object.values(signalByJourney)) {
    if (signal) {
      const p = SIGNAL_PRIORITY[signal] ?? 0;
      if (p > dominantPriority) { dominantPriority = p; dominantSignal = signal; }
    }
  }

  const peakLabel = peakPerformanceType ? performanceLabel(peakPerformanceType) : null;
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

  const response: DrillDownResponse = {
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

  return NextResponse.json(response);
}
