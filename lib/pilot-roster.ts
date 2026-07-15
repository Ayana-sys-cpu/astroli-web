// Pilot roster assembly for the founder's Pilot Review Dashboard.
//
// A "pilot student" is anyone enrolled in a class — school or family
// (student_classes → classes). Assembly is fetch-then-join-in-JS via
// supabaseAdmin (same pattern as /api/admin/families); pilot scale keeps
// this to a handful of .in() queries.
//
// Used by GET /api/admin/students (full roster) and
// GET /api/admin/students/[studentId] (single-student profile block).
// Contract: specs/founder/web-app/pilot-review-dashboard/contracts/admin-api.md

import { supabaseAdmin } from './supabase-server';
import { messageKeysFor } from './student-message-keys';
import { summarizeStudentActivity, type ActivitySessionRow } from './activity-sessions';

export interface AdminStudentRow {
  id:                 string;
  name:               string;
  alienName:          string | null;
  email:              string | null;
  track:              'family' | 'classroom';
  classTitles:        string[];
  parentName:         string | null;
  missionTitle:       string | null;
  activeMissionTitle: string | null;
  lastActiveAt:       string | null;
  isActiveNow:        boolean;
  messageCount:       number;
  coins:              number;
  sessionsLast7d:     number | null;
  minutesLast7d:      number | null;
  enrolledAt:         string | null;
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;

type UserRow = {
  id:           string;
  email:        string | null;
  full_name:    string | null;
  first_name:   string | null;
  name:         string | null;
  alien_name:   string | null;
  auth_user_id: string | null;
};

type ClassRow = { id: string; title: string; type: string | null; teacher_id: string };

function displayName(user: UserRow | undefined): string {
  if (!user) return 'Student';
  return (
    user.full_name ??
    user.first_name ??
    user.name ??
    user.alien_name ??
    user.email?.split('@')[0] ??
    'Student'
  );
}

export async function buildPilotRoster(options?: { studentId?: string }): Promise<AdminStudentRow[]> {
  // 1. Enrollments — being enrolled in any class is what makes a pilot student.
  let enrollmentsQuery = supabaseAdmin
    .from('student_classes')
    .select('student_id, class_id, enrolled_at');
  if (options?.studentId) {
    enrollmentsQuery = enrollmentsQuery.eq('student_id', options.studentId);
  }
  const { data: enrollments, error: enrollmentsError } = await enrollmentsQuery;
  if (enrollmentsError) throw enrollmentsError;

  const enrollmentRows = enrollments ?? [];
  const studentIds = Array.from(new Set(enrollmentRows.map((row) => row.student_id as string)));
  if (studentIds.length === 0) return [];
  const classIds = Array.from(
    new Set(enrollmentRows.map((row) => row.class_id as string | null).filter(Boolean)),
  ) as string[];

  // 2–8. Independent lookups, fired together: classes (school + family),
  // student profiles, parent links, mission starts, active mission states,
  // coins, activity sessions.
  const [
    { data: classes },
    { data: students },
    { data: parentLinks },
    { data: missionStarts },
    { data: activeMissionStates },
    { data: coinBalances },
    { data: activitySessions },
  ] = await Promise.all([
    supabaseAdmin.from('classes').select('id, title, type, teacher_id').in('id', classIds),
    supabaseAdmin
      .from('users')
      .select('id, email, full_name, first_name, name, alien_name, auth_user_id')
      .in('id', studentIds),
    supabaseAdmin.from('parent_child_link').select('parent_id, child_id').in('child_id', studentIds),
    supabaseAdmin
      .from('mission_started_by_student')
      .select('student_id, mission_id, created_at')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('class_mission_state')
      .select('class_id, mission_id')
      .in('class_id', classIds)
      .eq('state', 'active'),
    supabaseAdmin.from('student_coin_balances').select('student_id, balance').in('student_id', studentIds),
    supabaseAdmin
      .from('student_activity_sessions')
      .select('student_id, started_at, last_ping_at')
      .in('student_id', studentIds),
  ]);

  const classById = new Map<string, ClassRow>(((classes ?? []) as ClassRow[]).map((c) => [c.id, c]));
  const studentById = new Map<string, UserRow>(((students ?? []) as UserRow[]).map((s) => [s.id, s]));

  // Parent names (family track) — one extra lookup for linked parents only.
  const parentIdByChild = new Map<string, string>(
    (parentLinks ?? []).map((link) => [link.child_id as string, link.parent_id as string]),
  );
  const parentIds = Array.from(new Set(Array.from(parentIdByChild.values())));
  const parentNameById = new Map<string, string | null>();
  if (parentIds.length > 0) {
    const { data: parents } = await supabaseAdmin
      .from('users')
      .select('id, name, full_name, email')
      .in('id', parentIds);
    for (const parent of parents ?? []) {
      parentNameById.set(
        parent.id as string,
        (parent.name as string | null) ?? (parent.full_name as string | null) ?? (parent.email as string | null),
      );
    }
  }

  // Mission titles for both "latest started" and "active in class".
  const latestMissionIdByStudent = new Map<string, string>();
  for (const start of missionStarts ?? []) {
    const sid = start.student_id as string;
    if (!latestMissionIdByStudent.has(sid)) latestMissionIdByStudent.set(sid, start.mission_id as string);
  }
  const activeMissionIdByClass = new Map<string, string>(
    (activeMissionStates ?? []).map((state) => [state.class_id as string, state.mission_id as string]),
  );
  const missionIds = Array.from(
    new Set([...Array.from(latestMissionIdByStudent.values()), ...Array.from(activeMissionIdByClass.values())]),
  );
  const missionTitleById = new Map<string, string>();
  if (missionIds.length > 0) {
    const { data: missions } = await supabaseAdmin.from('missions').select('id, question').in('id', missionIds);
    for (const mission of missions ?? []) {
      missionTitleById.set(mission.id as string, mission.question as string);
    }
  }

  // Last-seen + message counts from bot messages, via the two-key bridge.
  // Pilot scale (hundreds of rows) — fetch and aggregate in JS.
  const studentIdByMessageKey = new Map<string, string>();
  for (const student of (students ?? []) as UserRow[]) {
    for (const key of messageKeysFor(student)) studentIdByMessageKey.set(key, student.id);
  }
  const lastMessageAtByStudent = new Map<string, number>();
  const messageCountByStudent = new Map<string, number>();
  const allMessageKeys = Array.from(studentIdByMessageKey.keys());
  if (allMessageKeys.length > 0) {
    const { data: messageRows } = await supabaseAdmin
      .from('messages')
      .select('student_id, created_at')
      .in('student_id', allMessageKeys)
      .limit(10000);
    for (const message of messageRows ?? []) {
      const sid = studentIdByMessageKey.get(message.student_id as string);
      if (!sid) continue;
      messageCountByStudent.set(sid, (messageCountByStudent.get(sid) ?? 0) + 1);
      const at = new Date(message.created_at as string).getTime();
      if (at > (lastMessageAtByStudent.get(sid) ?? 0)) lastMessageAtByStudent.set(sid, at);
    }
  }

  const coinsByStudent = new Map<string, number>(
    (coinBalances ?? []).map((row) => [row.student_id as string, row.balance as number]),
  );
  const sessionsByStudent = new Map<string, ActivitySessionRow[]>();
  for (const session of (activitySessions ?? []) as Array<ActivitySessionRow & { student_id: string }>) {
    const list = sessionsByStudent.get(session.student_id) ?? [];
    list.push(session);
    sessionsByStudent.set(session.student_id, list);
  }

  // Assemble one row per student.
  const now = new Date();
  const studentRows: AdminStudentRow[] = studentIds.map((studentId) => {
    const profile = studentById.get(studentId);
    const ownEnrollments = enrollmentRows.filter((row) => row.student_id === studentId);
    const ownClasses = ownEnrollments
      .map((row) => classById.get(row.class_id as string))
      .filter((c): c is ClassRow => Boolean(c));

    const isFamily = ownClasses.some((c) => c.type === 'family') || parentIdByChild.has(studentId);
    const parentId = parentIdByChild.get(studentId);

    const enrolledDates = ownEnrollments
      .map((row) => row.enrolled_at as string | null)
      .filter((d): d is string => Boolean(d))
      .sort();

    const activeMissionId = ownClasses
      .map((c) => activeMissionIdByClass.get(c.id))
      .find((id): id is string => Boolean(id));

    const ownSessions = sessionsByStudent.get(studentId) ?? [];
    const activitySummary = summarizeStudentActivity(ownSessions, now);

    const lastMessageMs = lastMessageAtByStudent.get(studentId) ?? 0;
    const lastSessionMs = activitySummary.lastActiveAt ? new Date(activitySummary.lastActiveAt).getTime() : 0;
    const lastActiveMs = Math.max(lastMessageMs, lastSessionMs);

    return {
      id:                 studentId,
      name:               displayName(profile),
      alienName:          profile?.alien_name ?? null,
      email:              profile?.email ?? null,
      track:              isFamily ? 'family' : 'classroom',
      classTitles:        ownClasses.map((c) => c.title),
      parentName:         parentId ? parentNameById.get(parentId) ?? null : null,
      missionTitle:       missionTitleById.get(latestMissionIdByStudent.get(studentId) ?? '') ?? null,
      activeMissionTitle: missionTitleById.get(activeMissionId ?? '') ?? null,
      lastActiveAt:       lastActiveMs > 0 ? new Date(lastActiveMs).toISOString() : null,
      isActiveNow:        lastActiveMs > 0 && now.getTime() - lastActiveMs < ACTIVE_THRESHOLD_MS,
      messageCount:       messageCountByStudent.get(studentId) ?? 0,
      coins:              coinsByStudent.get(studentId) ?? 0,
      sessionsLast7d:     ownSessions.length > 0 ? activitySummary.sessionsLast7d : null,
      minutesLast7d:      ownSessions.length > 0 ? activitySummary.minutesLast7d : null,
      enrolledAt:         enrolledDates[0] ?? null,
    };
  });

  studentRows.sort((a, b) => {
    if (a.lastActiveAt === b.lastActiveAt) return a.name.localeCompare(b.name);
    if (!a.lastActiveAt) return 1;
    if (!b.lastActiveAt) return -1;
    return b.lastActiveAt.localeCompare(a.lastActiveAt);
  });

  return studentRows;
}
