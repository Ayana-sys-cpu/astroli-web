import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSignals } from '@/lib/signals';
import { deriveJourneyStatus } from '@/lib/journey-status';
import type { JourneyStatus } from '@/lib/journey-status';

type MissionState = 'locked' | 'voting' | 'pending_start' | 'active' | 'completed' | 'skipped';

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

const TEN_DAYS_AGO = () => new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
const ATTENTION_SIGNAL_TYPES = new Set(['stuck', 'non_engagement', 'grace_completion']);

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  const journeys = await prisma.journey.findMany({
    where: { teacherId },
    select: {
      id: true,
      title: true,
      googleCourseId: true,
      missions: {
        select: { id: true, state: true, mission_order: true },
        orderBy: { mission_order: 'asc' },
      },
      vote_sessions: {
        where: { status: 'open' },
        select: { id: true, ends_at: true },
        take: 1,
      },
      student_journeys: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const acked = await prisma.teacherSignalAcknowledgement.findMany({
    where: { teacherId },
    select: { studentId: true, journeyId: true, signalType: true },
  });
  const ackedSet = new Set(acked.map(a => `${a.journeyId}:${a.studentId}:${a.signalType}`));

  // Batch all lastSession lookups in one query instead of N findFirst calls.
  const allSessions = await prisma.classSession.findMany({
    where: { teacherId, journeyId: { in: journeys.map(j => j.id) } },
    select: { journeyId: true, startedAt: true },
    orderBy: { startedAt: 'desc' },
  });
  const lastSessionByJourney = new Map<string, Date>();
  for (const s of allSessions) {
    if (!lastSessionByJourney.has(s.journeyId)) lastSessionByJourney.set(s.journeyId, s.startedAt);
  }

  const overview = await Promise.all(journeys.map(async j => {
    const openSession = j.vote_sessions[0] ?? null;
    const status = deriveJourneyStatus(j.missions, openSession !== null);
    const voteEndsAt = openSession?.ends_at?.toISOString() ?? null;

    const missionIds = j.missions.map(m => m.id);
    const rawSignals = await generateSignals(j.id, lastSessionByJourney.get(j.id) ?? null, missionIds);
    const cutoff = TEN_DAYS_AGO();
    const attentionCount = rawSignals.filter(s =>
      s.signalCreatedAt > cutoff &&
      ATTENTION_SIGNAL_TYPES.has(s.signalType) &&
      !ackedSet.has(`${j.id}:${s.studentId}:${s.signalType}`)
    ).length;

    return {
      id:             j.id,
      title:          j.title,
      googleCourseId: j.googleCourseId,
      status,
      statusNote:     buildStatusNote(status, j.missions, voteEndsAt),
      voteEndsAt,
      studentCount:   j.student_journeys.length,
      attentionCount,
      coverGradient:  coverGradient(j.id),
    };
  }));

  return NextResponse.json({ journeys: overview });
}
