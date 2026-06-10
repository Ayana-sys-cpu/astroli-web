// =============================================================================
// GET /api/teacher/homescreen
//
// Returns:
//   journeys: Journey[]
//   spotlight: SpotlightStudent[]   — signal-grouped, ordered per spec
//   classPicture: ClassInsight[]    — 2-4 class-wide lines
//
// Signal generation currently uses messages + mission_started_by_student.
// TODO: replace generateSignals() with planet_summaries queries once the
// planet completion pipeline is built.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

export type SignalType = 'breakthrough' | 'grace_completion' | 'stuck' | 'non_engagement';

export interface SpotlightStudent {
  studentId: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  signalType: SignalType;
  insightLine: string;
  signalCreatedAt: string;
  phoneNumber: string | null;
}

export interface ClassInsight {
  signalType: SignalType | 'coverage' | 'progress';
  text: string;
  count: number;
}

// ---------------------------------------------------------------------------
// SIGNAL GENERATION
// TODO: Replace this function body with planet_summaries queries once built.
// ---------------------------------------------------------------------------
async function generateSignals(
  journeyId: string,
  lastSessionAt: Date | null
): Promise<{ studentId: string; signalType: SignalType; signalCreatedAt: Date }[]> {
  // Resolve mission IDs for this journey (mission_started_by_student has no journey_id column)
  const { data: missionRows } = await supabaseAdmin
    .from('missions')
    .select('id')
    .eq('journey_id', journeyId);

  const missionIds = (missionRows ?? []).map((m: { id: string }) => m.id);
  if (missionIds.length === 0) return [];

  const { data: startedRows } = await supabaseAdmin
    .from('mission_started_by_student')
    .select('student_id, created_at')
    .in('mission_id', missionIds);

  if (!startedRows || startedRows.length === 0) return [];

  // Deduplicate: one signal per student (earliest started_at wins)
  const byStudent = new Map<string, Date>();
  for (const row of startedRows) {
    const sid = row.student_id as string;
    const ts = new Date(row.created_at);
    if (!byStudent.has(sid) || ts < byStudent.get(sid)!) byStudent.set(sid, ts);
  }

  const signals: { studentId: string; signalType: SignalType; signalCreatedAt: Date }[] = [];
  const since = lastSessionAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const [studentId, startedAt] of Array.from(byStudent.entries())) {
    // TEST SIGNAL OVERRIDE: if the student has a message with content starting
    // "[SIGNAL:xxx]", use that as the signal type. Used for seeded test data only.
    // Remove this block once planet_summaries pipeline is live.
    const { data: overrideMsg } = await supabaseAdmin
      .from('messages')
      .select('content')
      .eq('student_id', studentId)
      .like('content', '[SIGNAL:%]')
      .order('created_at', { ascending: false })
      .limit(1);

    if (overrideMsg && overrideMsg.length > 0) {
      const match = (overrideMsg[0].content as string).match(/^\[SIGNAL:(\w+)\]/);
      const overrideType = match?.[1] as SignalType | undefined;
      if (overrideType && ['breakthrough', 'grace_completion', 'stuck', 'non_engagement'].includes(overrideType)) {
        signals.push({ studentId, signalType: overrideType, signalCreatedAt: startedAt });
        continue;
      }
    }

    // Default: non_engagement if no messages since last session
    const { count } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', since.toISOString());

    if ((count ?? 0) === 0) {
      signals.push({ studentId, signalType: 'non_engagement', signalCreatedAt: startedAt });
    }
  }

  return signals;
}

function insightLine(signalType: SignalType): string {
  switch (signalType) {
    case 'breakthrough':
      return 'Reached a new depth of understanding — worth acknowledging.';
    case 'grace_completion':
      return 'Completed a planet but didn\'t demonstrate understanding — a conversation might open a new entry point.';
    case 'stuck':
      return 'Is exploring actively but the concept isn\'t landing yet — may need a different angle.';
    case 'non_engagement':
      return 'Hasn\'t been engaging lately — may need a check-in.';
  }
}

const SIGNAL_ORDER: Record<SignalType, number> = {
  breakthrough: 0,
  grace_completion: 1,
  stuck: 2,
  non_engagement: 3,
};

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  const journeys = await prisma.journey.findMany({
    where: { teacherId },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  if (journeys.length === 0) {
    return NextResponse.json({ journeys: [], spotlight: [], classPicture: [] });
  }

  const primaryJourney = journeys[0];

  const lastSession = await prisma.classSession.findFirst({
    where: { journeyId: primaryJourney.id, teacherId },
    orderBy: { startedAt: 'desc' },
  });

  const rawSignals = await generateSignals(primaryJourney.id, lastSession?.startedAt ?? null);

  const TEN_DAYS_AGO = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const acked = await prisma.teacherSignalAcknowledgement.findMany({
    where: { teacherId, journeyId: primaryJourney.id },
    select: { studentId: true, signalType: true },
  });
  const ackedSet = new Set(acked.map(a => `${a.studentId}:${a.signalType}`));

  const activeSignals = rawSignals.filter(s =>
    s.signalCreatedAt > TEN_DAYS_AGO &&
    !ackedSet.has(`${s.studentId}:${s.signalType}`)
  );

  const studentIds = Array.from(new Set(activeSignals.map(s => s.studentId)));
  const { data: studentRows } = await supabaseAdmin
    .from('students')
    .select('id, alien_name, bot_base_avatar')
    .in('id', studentIds.length > 0 ? studentIds : ['__none__']);

  const studentMap = new Map((studentRows ?? []).map(s => [s.id, s]));

  const spotlight: SpotlightStudent[] = activeSignals
    .sort((a, b) => {
      const orderDiff = SIGNAL_ORDER[a.signalType] - SIGNAL_ORDER[b.signalType];
      if (orderDiff !== 0) return orderDiff;
      return b.signalCreatedAt.getTime() - a.signalCreatedAt.getTime();
    })
    .map(s => {
      const student = studentMap.get(s.studentId);
      const name = student?.alien_name ?? 'Student';
      const words = name.split(' ');
      const initials = words.map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
      return {
        studentId: s.studentId,
        name,
        avatarUrl: student?.bot_base_avatar ?? null,
        initials,
        signalType: s.signalType,
        insightLine: insightLine(s.signalType),
        signalCreatedAt: s.signalCreatedAt.toISOString(),
        phoneNumber: null,
      };
    });

  const counts: Record<SignalType, number> = { breakthrough: 0, grace_completion: 0, stuck: 0, non_engagement: 0 };
  for (const s of activeSignals) counts[s.signalType]++;

  const classPicture: ClassInsight[] = [];
  if (counts.breakthrough > 0) classPicture.push({ signalType: 'breakthrough', text: counts.breakthrough === 1 ? 'One student reached a new depth of understanding this session.' : `${counts.breakthrough} students reached new depths of understanding.`, count: counts.breakthrough });
  if (counts.grace_completion > 0) classPicture.push({ signalType: 'grace_completion', text: `${counts.grace_completion} student${counts.grace_completion > 1 ? 's' : ''} completed via grace threshold.`, count: counts.grace_completion });
  if (counts.stuck > 0) classPicture.push({ signalType: 'stuck', text: `${counts.stuck} student${counts.stuck > 1 ? 's' : ''} exploring actively but not connecting to the teaching goal.`, count: counts.stuck });
  if (counts.non_engagement > 0) classPicture.push({ signalType: 'non_engagement', text: `${counts.non_engagement} student${counts.non_engagement > 1 ? 's' : ''} haven't been engaging since the last session.`, count: counts.non_engagement });

  if (classPicture.length === 0) {
    classPicture.push({ signalType: 'progress', text: 'Your class is on track — no students need immediate attention.', count: 0 });
  }

  return NextResponse.json({ journeys, spotlight, classPicture });
}
