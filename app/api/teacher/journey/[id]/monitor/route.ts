// src/astroli-web/app/api/teacher/journey/[id]/monitor/route.ts
// =============================================================================
// GET /api/teacher/journey/[id]/monitor
//
// Returns live monitoring data for a journey's active class session:
//   - Active mission info
//   - Per-student status (active, offline, planet)
//   - Attention signals (grace_completion, stuck, non_engagement) — unacked only
//   - Presence count (students active in last 5 min)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-server';
import { generateSignals, type SignalType } from '@/lib/signals';
import {
  buildContextLine,
  orderAttentionStudents,
  type AttentionSignalType,
} from '@/lib/journey-monitor-helpers';

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;
const ATTENTION_TYPES = new Set<string>(['grace_completion', 'stuck', 'non_engagement']);

function toInitials(name: string): string {
  return (name.trim() || 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export interface MonitorStudentRow {
  studentId: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  statusLine: string;
  isActiveNow: boolean;
  lastSeenAt: string | null;
  signalType: AttentionSignalType | null;
  contextLine: string | null;
  signalCreatedAt: string | null;
}

export interface MonitorResponse {
  journeyId: string;
  journeyTitle: string;
  activeMission: {
    id: string;
    question: string;
    missionOrder: number;
  } | null;
  presenceCount: number;
  attentionStudents: MonitorStudentRow[];
  allStudents: MonitorStudentRow[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;
  const journeyId = params.id; // a classes.id — see redesign doc

  // 1. Verify the class belongs to this teacher; fetch the template's
  // missions plus this class's live state.
  const klass = await prisma.class.findFirst({
    where: { id: journeyId, teacherId },
    select: {
      id: true,
      title: true,
      journey: {
        select: {
          missions: {
            select: { id: true, question: true, mission_order: true },
            orderBy: { mission_order: 'asc' },
          },
        },
      },
      classMissionState: {
        select: { missionId: true, state: true },
      },
    },
  });

  if (!klass) {
    return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
  }

  const stateByMission = new Map(klass.classMissionState.map(s => [s.missionId, s.state]));
  const missions = klass.journey.missions.map(m => ({
    ...m,
    state: stateByMission.get(m.id) ?? 'locked',
  }));
  const journey = { id: klass.id, title: klass.title, missions };

  // 2. Find the active mission
  const activeMission = journey.missions.find(m => m.state === 'active') ?? null;

  // 3. Get enrolled students
  const { data: enrollmentRows } = await supabaseAdmin
    .from('student_classes')
    .select('student_id')
    .eq('class_id', journeyId);

  const studentIds = (enrollmentRows ?? []).map((r: { student_id: string }) => r.student_id);

  if (studentIds.length === 0) {
    const response: MonitorResponse = {
      journeyId,
      journeyTitle: journey.title,
      activeMission: activeMission
        ? { id: activeMission.id, question: activeMission.question, missionOrder: activeMission.mission_order }
        : null,
      presenceCount: 0,
      attentionStudents: [],
      allStudents: [],
    };
    return NextResponse.json(response);
  }

  // 4. Get student profiles
  const { data: userRows } = await supabaseAdmin
    .from('users')
    .select('id, full_name, first_name, avatar_url, auth_user_id')
    .in('id', studentIds);

  type UserRow = {
    id: string;
    full_name: string | null;
    first_name: string | null;
    avatar_url: string | null;
    auth_user_id: string | null;
  };

  const profileMap = new Map<string, UserRow>(
    (userRows ?? []).map((u: UserRow) => [u.id, u]),
  );

  const authIdToUserId = new Map<string, string>();
  for (const u of userRows ?? []) {
    if ((u as UserRow).auth_user_id) {
      authIdToUserId.set((u as UserRow).auth_user_id!, u.id);
    }
  }
  const allAuthIds = Array.from(authIdToUserId.keys());

  // 5. Get recent messages (last 5 min) to compute presence + last-seen
  const fiveMinAgo = new Date(Date.now() - ACTIVE_THRESHOLD_MS).toISOString();

  const { data: recentMsgRows } = allAuthIds.length > 0
    ? await supabaseAdmin
        .from('messages')
        .select('student_id, created_at')
        .in('student_id', allAuthIds)
        .gte('created_at', fiveMinAgo)
        .order('created_at', { ascending: false })
    : { data: [] };

  const activeAuthIds = new Set((recentMsgRows ?? []).map((r: { student_id: string }) => r.student_id));
  const presenceCount = new Set(
    Array.from(activeAuthIds).map(aid => authIdToUserId.get(aid)).filter(Boolean),
  ).size;

  // Also get last-seen for all students (not just last 5 min)
  const { data: lastMsgRows } = allAuthIds.length > 0
    ? await supabaseAdmin
        .from('messages')
        .select('student_id, created_at')
        .in('student_id', allAuthIds)
        .order('created_at', { ascending: false })
        .limit(Math.max(allAuthIds.length * 50, 500))
    : { data: [] };

  const lastSeenMap = new Map<string, Date>();
  for (const row of lastMsgRows ?? []) {
    const authId = row.student_id as string;
    const userId = authIdToUserId.get(authId);
    if (userId && !lastSeenMap.has(userId)) {
      lastSeenMap.set(userId, new Date(row.created_at));
    }
  }

  // 6. Generate signals for this class. generateSignals falls back to
  // looking up missions by journey_id when missionIds is omitted — but
  // journeyId here is a class id, so pass the template's mission ids
  // explicitly (already resolved in step 1).
  const lastSession = await prisma.classSession.findFirst({
    where: { classId: journeyId, teacherId },
    orderBy: { startedAt: 'desc' },
  });

  const rawSignals = await generateSignals(journeyId, lastSession?.startedAt ?? null, journey.missions.map(m => m.id));

  // Map studentId → signal (keep highest priority attention signal only)
  const SIGNAL_PRIORITY: Record<SignalType, number> = {
    breakthrough: 0,
    grace_completion: 1,
    stuck: 2,
    non_engagement: 3,
  };

  const signalMap = new Map<string, { signalType: SignalType; signalCreatedAt: Date }>();
  for (const s of rawSignals) {
    if (!ATTENTION_TYPES.has(s.signalType)) continue;
    const existing = signalMap.get(s.studentId);
    if (!existing || SIGNAL_PRIORITY[s.signalType] < SIGNAL_PRIORITY[existing.signalType]) {
      signalMap.set(s.studentId, s);
    }
  }

  // 7. Check acknowledgements
  const acked = await prisma.teacherSignalAcknowledgement.findMany({
    where: { teacherId, classId: journeyId },
    select: { studentId: true, signalType: true },
  });
  const ackedSet = new Set(acked.map(a => `${a.studentId}:${a.signalType}`));

  // 8. Build student rows
  const now = Date.now();
  const allStudents: MonitorStudentRow[] = studentIds.map(studentId => {
    const profile = profileMap.get(studentId);
    const name = profile?.full_name ?? profile?.first_name ?? 'Student';
    const lastSeen = lastSeenMap.get(studentId) ?? null;
    const isActiveNow = lastSeen ? now - lastSeen.getTime() < ACTIVE_THRESHOLD_MS : false;

    const signal = signalMap.get(studentId);
    const isAcked = signal ? ackedSet.has(`${studentId}:${signal.signalType}`) : false;
    const effectiveSignal = signal && !isAcked ? signal : null;

    // "Offline" only when the student has never been active in this journey.
    // Students who were active but stepped away get a relative "last active" line.
    const statusLine = (() => {
      if (isActiveNow) return 'Actively exploring';
      if (!lastSeen) return 'Not yet started';
      const mins = Math.round((now - lastSeen.getTime()) / 60000);
      return mins <= 1 ? 'Just stepped away' : `Last active ${mins} min ago`;
    })();

    return {
      studentId,
      name,
      initials: toInitials(name),
      avatarUrl: profile?.avatar_url ?? null,
      statusLine,
      isActiveNow,
      lastSeenAt: lastSeen?.toISOString() ?? null,
      signalType: effectiveSignal ? (effectiveSignal.signalType as AttentionSignalType) : null,
      contextLine: effectiveSignal
        ? buildContextLine(effectiveSignal.signalType as AttentionSignalType, null, null)
        : null,
      signalCreatedAt: effectiveSignal?.signalCreatedAt?.toISOString() ?? null,
    };
  });

  const attentionStudents = orderAttentionStudents(
    allStudents.filter(s => s.signalType !== null) as (MonitorStudentRow & {
      signalType: AttentionSignalType;
      signalCreatedAt: string;
    })[],
  );

  const response: MonitorResponse = {
    journeyId,
    journeyTitle: journey.title,
    activeMission: activeMission
      ? { id: activeMission.id, question: activeMission.question, missionOrder: activeMission.mission_order }
      : null,
    presenceCount,
    attentionStudents,
    allStudents,
  };

  return NextResponse.json(response);
}
