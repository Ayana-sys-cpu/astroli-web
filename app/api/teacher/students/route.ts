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
import { generateSignals, type SignalType } from '@/lib/signals';

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

const lastName = (n: string) => n.split(' ').pop() ?? n;

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;
  const journeyIdFilter = req.nextUrl.searchParams.get('journeyId');

  // 1. Fetch all journeys for this teacher
  const allJourneys = await prisma.journey.findMany({
    where: { teacherId },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  const targetJourneys = journeyIdFilter
    ? allJourneys.filter((j) => j.id === journeyIdFilter)
    : allJourneys;

  if (targetJourneys.length === 0) {
    return NextResponse.json({ students: [], journeys: allJourneys });
  }

  const targetJourneyIds = targetJourneys.map((j) => j.id);

  // 2. Find all student_journey enrollments for the target journeys
  const { data: enrollmentRows } = await supabaseAdmin
    .from('student_journeys')
    .select('student_id, journey_id')
    .in('journey_id', targetJourneyIds);

  const rows = enrollmentRows ?? [];

  // Build: studentId → set of journey IDs they're enrolled in
  const studentJourneyMap = new Map<string, Set<string>>();
  for (const row of rows) {
    const sid = row.student_id as string;
    const jid = row.journey_id as string;
    if (!studentJourneyMap.has(sid)) studentJourneyMap.set(sid, new Set());
    studentJourneyMap.get(sid)!.add(jid);
  }

  const allStudentIds = Array.from(studentJourneyMap.keys());
  if (allStudentIds.length === 0) {
    return NextResponse.json({ students: [], journeys: allJourneys });
  }

  // 3. Fetch student profiles
  const { data: studentRows } = await supabaseAdmin
    .from('students')
    .select('id, alien_name')
    .in('id', allStudentIds);

  const studentProfileMap = new Map(
    (studentRows ?? []).map((s: { id: string; alien_name: string }) => [s.id, s]),
  );

  // 4. Fetch last-seen timestamps (most recent message per student).
  //    Limit to allStudentIds.length * 5 rows — we only need one row per student
  //    and this prevents unbounded scans on high-volume classrooms.
  //    TODO: replace with DISTINCT ON (student_id) RPC once Supabase supports it.
  const { data: lastMsgRows } = await supabaseAdmin
    .from('messages')
    .select('student_id, created_at')
    .in('student_id', allStudentIds)
    .order('created_at', { ascending: false })
    .limit(allStudentIds.length * 5);

  const lastSeenMap = new Map<string, Date>();
  for (const row of lastMsgRows ?? []) {
    const sid = row.student_id as string;
    if (!lastSeenMap.has(sid)) lastSeenMap.set(sid, new Date(row.created_at));
  }

  // 5. Generate signals across all target journeys
  //    Highest-priority signal wins when a student appears in multiple journeys.
  const SIGNAL_PRIORITY: Record<SignalType, number> = {
    breakthrough: 0,
    grace_completion: 1,
    stuck: 2,
    non_engagement: 3,
  };

  const signalMap = new Map<string, SignalType>();

  // NOTE: generateSignals issues per-student DB queries internally (N+1 per journey).
  // This is acceptable for Phase 1 classroom sizes (< 40 students). Replace with a
  // batched query against planet_summaries once that pipeline is live (Phase 2 TODO).
  for (const journey of targetJourneys) {
    const lastSession = await prisma.classSession.findFirst({
      where: { journeyId: journey.id, teacherId },
      orderBy: { startedAt: 'desc' },
    });

    const signals = await generateSignals(journey.id, lastSession?.startedAt ?? null);

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
      const name = profile?.alien_name ?? 'Student';
      const lastSeen = lastSeenMap.get(studentId) ?? null;
      const enrolledJourneyIds = Array.from(studentJourneyMap.get(studentId) ?? []);

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
