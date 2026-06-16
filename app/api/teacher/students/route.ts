// src/astroli-web/app/api/teacher/students/route.ts
// =============================================================================
// GET /api/teacher/students?journeyId=<id>
//
// Returns all students enrolled in any of the teacher's journeys (or a specific
// journey if journeyId is provided), with their signal and last-seen timestamp.
//
// Response shape:
//   students: StudentSummary[]
//   journeys: { id: string; title: string }[]
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { generateSignalsBatch, type SignalType } from '@/lib/signals';

export interface StudentSummary {
  studentId: string;
  name: string;
  initials: string;
  lastSeenAt: string | null;   // ISO timestamp of most recent message
  isActiveNow: boolean;        // last message within 5 minutes
  signalType: SignalType | null;
  journeyEnrollments: { journeyId: string; title: string }[];
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function toInitials(name: string): string {
  return (name.trim() || 'S')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const lastName = (n: string) => n.trim().split(/\s+/).pop() ?? n;

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;
  const journeyIdFilter = req.nextUrl.searchParams.get('journeyId'); // a classes.id

  // 1. Fetch all classes for this teacher. The response's `journeys` field
  // keeps its old name for frontend backward compatibility, but these are
  // classes.id values now — see docs/architecture/2026-06-16-journeys-classes-redesign.md.
  const allJourneys = await prisma.class.findMany({
    where: { teacherId },
    select: { id: true, title: true, journeyId: true },
    orderBy: { title: 'asc' },
  });

  const targetJourneys = journeyIdFilter
    ? allJourneys.filter((j) => j.id === journeyIdFilter)
    : allJourneys;

  if (targetJourneys.length === 0) {
    return NextResponse.json({ students: [], journeys: allJourneys });
  }

  const targetJourneyIds = targetJourneys.map((j) => j.id); // class ids

  // 2. Find all student_journey enrollments for the target classes
  const { data: enrollmentRows } = await supabaseAdmin
    .from('student_classes')
    .select('student_id, class_id')
    .in('class_id', targetJourneyIds);

  const rows = enrollmentRows ?? [];

  // Build: studentId → set of class IDs they're enrolled in
  const studentJourneyMap = new Map<string, Set<string>>();
  for (const row of rows) {
    const sid = row.student_id as string;
    const cid = row.class_id as string | null;
    if (!cid) continue;
    if (!studentJourneyMap.has(sid)) studentJourneyMap.set(sid, new Set());
    studentJourneyMap.get(sid)!.add(cid);
  }

  const allStudentIds = Array.from(studentJourneyMap.keys());
  if (allStudentIds.length === 0) {
    return NextResponse.json({ students: [], journeys: allJourneys });
  }

  // When a class filter is active, enrollmentRows only covers that class.
  // Fetch all enrollments for the included students so journey pills show every class.
  const fullStudentJourneyMap: Map<string, Set<string>> = journeyIdFilter
    ? await (async () => {
        const { data: allEnrollRows } = await supabaseAdmin
          .from('student_classes')
          .select('student_id, class_id')
          .in('student_id', allStudentIds);
        const m = new Map<string, Set<string>>();
        for (const row of allEnrollRows ?? []) {
          const sid = row.student_id as string;
          const cid = row.class_id as string | null;
          if (!cid) continue;
          if (!m.has(sid)) m.set(sid, new Set());
          m.get(sid)!.add(cid);
        }
        return m;
      })()
    : studentJourneyMap;

  // 3. Fetch student profiles from the users table (student_journeys.student_id = users.id).
  //    Also fetch auth_user_id — messages are keyed by the Supabase auth UUID, not users.id.
  const { data: studentRows } = await supabaseAdmin
    .from('users')
    .select('id, full_name, first_name, auth_user_id')
    .in('id', allStudentIds);

  type UserRow = { id: string; full_name: string | null; first_name: string | null; auth_user_id: string | null };
  const studentProfileMap = new Map(
    (studentRows ?? []).map((s: UserRow) => [s.id, s]),
  );

  // Map auth_user_id → users.id for translating message rows back to student IDs.
  const authIdToUserId = new Map<string, string>();
  for (const s of studentRows ?? []) {
    if ((s as UserRow).auth_user_id) authIdToUserId.set((s as UserRow).auth_user_id!, s.id);
  }
  const allAuthIds = Array.from(authIdToUserId.keys());

  // 4. Fetch last-seen timestamps via MAX(created_at) GROUP BY — avoids
  //    pulling N×50 rows and scanning them in JS memory.
  let lastSeenRows: { student_id: string; last_seen: Date | null }[] = [];
  if (allAuthIds.length > 0) {
    try {
      lastSeenRows = await prisma.$queryRawUnsafe<{ student_id: string; last_seen: Date | null }[]>(
        `SELECT student_id::text, MAX(created_at) AS last_seen
         FROM messages
         WHERE student_id = ANY($1::uuid[])
         GROUP BY student_id`,
        allAuthIds,
      );
    } catch (err) {
      console.error('[GET /api/teacher/students] last-seen query failed', err);
      // Non-fatal: last-seen data degrades gracefully to null for all students.
    }
  }

  const lastSeenMap = new Map<string, Date>();
  for (const row of lastSeenRows) {
    const userId = authIdToUserId.get(row.student_id);
    if (userId && row.last_seen) lastSeenMap.set(userId, row.last_seen);
  }

  // 5. Generate signals across all target classes — one batch call instead of
  //    one generateSignals call per class. Highest-priority signal wins when
  //    a student appears in multiple classes.
  //
  // generateSignalsBatch treats `journeyId` as an opaque grouping key as long
  // as `missionIds` is pre-supplied (it only falls back to looking up
  // missions by journey_id when missionIds is omitted) — so a class id works
  // fine here as long as we resolve each class's template missions ourselves.
  const SIGNAL_PRIORITY: Record<SignalType, number> = {
    breakthrough: 0,
    grace_completion: 1,
    stuck: 2,
    non_engagement: 3,
  };

  const templateJourneyIds = Array.from(new Set(targetJourneys.map(j => j.journeyId)));
  const { data: missionRows } = await supabaseAdmin
    .from('missions')
    .select('id, journey_id')
    .in('journey_id', templateJourneyIds);

  const missionIdsByTemplate = new Map<string, string[]>();
  for (const m of missionRows ?? []) {
    const list = missionIdsByTemplate.get(m.journey_id) ?? [];
    list.push(m.id);
    missionIdsByTemplate.set(m.journey_id, list);
  }

  const allSessions = await prisma.classSession.findMany({
    where: { teacherId, classId: { in: targetJourneyIds } },
    select: { classId: true, startedAt: true },
    orderBy: { startedAt: 'desc' },
  });
  const lastSessionByJourney = new Map<string, Date>();
  for (const s of allSessions) {
    if (s.classId && !lastSessionByJourney.has(s.classId)) lastSessionByJourney.set(s.classId, s.startedAt);
  }

  const signalsByJourney = await generateSignalsBatch(
    targetJourneys.map(j => ({
      journeyId:     j.id,
      missionIds:    missionIdsByTemplate.get(j.journeyId) ?? [],
      lastSessionAt: lastSessionByJourney.get(j.id) ?? null,
    })),
  );

  const signalMap = new Map<string, SignalType>();
  for (const signals of Array.from(signalsByJourney.values())) {
    for (const signal of signals) {
      const existing = signalMap.get(signal.studentId);
      if (!existing || SIGNAL_PRIORITY[signal.signalType] < SIGNAL_PRIORITY[existing]) {
        signalMap.set(signal.studentId, signal.signalType);
      }
    }
  }

  // 6. Build journey title map for enrollments
  const journeyTitleMap = new Map(allJourneys.map((j) => [j.id, j.title]));

  // 7. Assemble student summaries, sorted alphabetically by last name
  const now = Date.now();
  const students: StudentSummary[] = allStudentIds
    .map((studentId) => {
      const profile = studentProfileMap.get(studentId);
      const name = profile?.full_name ?? profile?.first_name ?? 'Student';
      const lastSeen = lastSeenMap.get(studentId) ?? null;
      const enrolledJourneyIds = Array.from(fullStudentJourneyMap.get(studentId) ?? []);

      return {
        studentId,
        name,
        initials: toInitials(name),
        lastSeenAt: lastSeen?.toISOString() ?? null,
        isActiveNow: lastSeen ? now - lastSeen.getTime() < ACTIVE_THRESHOLD_MS : false,
        signalType: signalMap.get(studentId) ?? null,
        journeyEnrollments: enrolledJourneyIds
          .filter((jid) => journeyTitleMap.has(jid))
          .map((jid) => ({ journeyId: jid, title: journeyTitleMap.get(jid)! })),
      };
    })
    .sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)));

  return NextResponse.json({ students, journeys: allJourneys });
}
