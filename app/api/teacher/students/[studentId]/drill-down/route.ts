// src/astroli-web/app/api/teacher/students/[studentId]/drill-down/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import type {
  DrillDownResponse,
  SubjectSummary,
  GoalSummary,
  PlanetStatus,
} from '@/lib/drill-down-types';
import { toPerformanceType } from '@/lib/drill-down-types';

type UserRow = { full_name: string | null; first_name: string | null } | null;

function toInitials(name: string): string {
  return (name.trim() || 'S')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

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

  // 1. Fetch all teacher journeys that this student is enrolled in
  const sharedJourneys = await prisma.journey.findMany({
    where: {
      teacherId,
      student_journeys: { some: { student_id: studentId } },
    },
    select: {
      id: true,
      title: true,
      missions: {
        orderBy: { mission_order: 'asc' },
        select: {
          id: true,
          question: true,
          mission_order: true,
          state: true,
          planets: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, title: true },
          },
        },
      },
    },
    orderBy: { title: 'asc' },
  });

  if (sharedJourneys.length === 0) {
    return NextResponse.json(
      { error: 'Student not found or not enrolled in any of your journeys.' },
      { status: 404 },
    );
  }

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

  // 3. Collect all planet IDs across all shared journeys
  const planetIds: string[] = sharedJourneys.flatMap((j) =>
    j.missions.flatMap((m) => m.planets.map((p) => p.id)),
  );

  // 4. Fetch planet_summaries for this student (with goals)
  const summaries = await prisma.planetSummary.findMany({
    where: { studentId, planetId: { in: planetIds } },
    include: { goals: { orderBy: { createdAt: 'asc' } } },
  });

  const summaryByPlanetId = new Map(summaries.map((s) => [s.planetId, s]));

  // 5. Build subject list
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

        // Planets in non-active missions are "Pending Activation" from the student's POV
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
          teachingGoalCount: 0,
        });
      }
    }
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
    activeMissionByJourney: {},
    missionsByJourney: {},
    signalByJourney: {},
    crossJourneyStats: {
      peakPerformanceType: null,
      peakJourneyTitle: null,
      activeMissionsCount: 0,
      totalMissionsCount: 0,
      weeklyExplorationChangePercent: null,
    },
    prewrittenMessage: '',
  };

  return NextResponse.json(response);
}
