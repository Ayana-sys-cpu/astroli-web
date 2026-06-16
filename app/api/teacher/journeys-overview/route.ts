import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deriveJourneyStatus } from '@/lib/journey-status';
import type { JourneyStatus } from '@/lib/journey-status';
import { generateSignalsBatch } from '@/lib/signals';

type MissionState = 'locked' | 'voting' | 'pending_start' | 'active' | 'completed' | 'skipped';

const ATTENTION_SIGNAL_TYPES = new Set(['stuck', 'non_engagement', 'grace_completion']);

const COVER_GRADIENTS = [
  { from: '#0d2137', mid: '#1e4d7a', accent: '#204060' },
  { from: '#140a30', mid: '#3d1f8a', accent: '#2a1560' },
  { from: '#0a1f12', mid: '#1a4a2e', accent: '#0d2018' },
  { from: '#2a0e0e', mid: '#6b1f1f', accent: '#3d1212' },
  { from: '#0e1a2a', mid: '#1f3a5a', accent: '#142035' },
  { from: '#1a0a30', mid: '#4a2070', accent: '#2a1050' },
];

function coverGradient(journeyId: string) {
  const hash = journeyId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
}

function hoursUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
}

function buildStatusNote(
  status: JourneyStatus,
  missions: { state: MissionState; mission_order: number }[],
  voteEndsAt: string | null,
): string {
  switch (status) {
    case 'live': {
      const active = missions.find(m => m.state === 'active');
      return active ? `Mission ${active.mission_order} of ${missions.length}` : '';
    }
    case 'voting':
      return voteEndsAt ? `Closes in ${hoursUntil(voteEndsAt)}h` : 'Voting open';
    case 'pending':
      return 'Vote concluded';
    case 'done': {
      const finished = missions.filter(m => m.state === 'completed' || m.state === 'skipped').length;
      return `${finished} of ${missions.length} missions`;
    }
    default:
      return 'Not started';
  }
}

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  // `journeys` in the response keeps its old field name for frontend
  // backward compatibility, but these rows are classes now — missions are
  // owned exclusively by the template (via journey relation) and never
  // duplicated; each class's live state comes from classMissionState.
  // See docs/architecture/2026-06-16-journeys-classes-redesign.md.
  const classes = await prisma.class.findMany({
    where: { teacherId },
    select: {
      id: true,
      title: true,
      googleCourseId: true,
      journey: {
        select: {
          missions: {
            select: { id: true, mission_order: true, question: true },
            orderBy: { mission_order: 'asc' },
          },
        },
      },
      classMissionState: {
        select: { missionId: true, state: true },
      },
      voteSessions: {
        where: { status: 'open' },
        select: { id: true, ends_at: true },
        take: 1,
      },
      studentJourneys: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const journeys = classes.map(c => {
    const stateByMission = new Map(c.classMissionState.map(s => [s.missionId, s.state]));
    const missions = c.journey.missions.map(m => ({
      id:            m.id,
      mission_order: m.mission_order,
      question:      m.question,
      state:         stateByMission.get(m.id) ?? 'locked',
    }));
    return { id: c.id, title: c.title, googleCourseId: c.googleCourseId, missions, voteSessions: c.voteSessions, studentCount: c.studentJourneys.length };
  });

  // One batch call instead of N individual generateSignals calls.
  const signalsByJourney = await generateSignalsBatch(
    journeys.map(j => ({
      journeyId:     j.id,
      missionIds:    j.missions.map(m => m.id),
      lastSessionAt: null,
    })),
  );

  const overview = journeys.map(j => {
    const openSession    = j.voteSessions[0] ?? null;
    const status         = deriveJourneyStatus(j.missions, openSession !== null);
    const voteEndsAt     = openSession?.ends_at?.toISOString() ?? null;
    const activeMission  = j.missions.find(m => m.state === 'active') ?? null;
    const signals        = signalsByJourney.get(j.id) ?? [];
    const attentionCount = signals.filter(s => ATTENTION_SIGNAL_TYPES.has(s.signalType)).length;

    return {
      id:                    j.id,
      title:                 j.title,
      googleCourseId:        j.googleCourseId,
      status,
      statusNote:            buildStatusNote(status, j.missions, voteEndsAt),
      voteEndsAt,
      studentCount:          j.studentCount,
      attentionCount,
      activeMissionQuestion: activeMission?.question ?? null,
      coverGradient:         coverGradient(j.id),
    };
  });

  return NextResponse.json({ journeys: overview });
}
