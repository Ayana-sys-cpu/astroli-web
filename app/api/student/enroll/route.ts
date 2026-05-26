import { NextRequest, NextResponse } from 'next/server';
import { enrollStudentInJourneys } from '@/lib/enroll-student';
import { requireAuth, assertStudentSession } from '@/lib/auth';

// POST /api/student/enroll
// Called after a student signs in (both new and returning).
// Looks up the student's Google Classroom courses and upserts matching rows
// into student_journeys so the student sees their teacher's journeys.
//
// Body: { accessToken: string }
// studentId is taken from the session — never from the body.
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertStudentSession(auth.user);
  if (sessionError) return sessionError;

  const studentId = auth.user.user_metadata.student_id as string;

  let body: { accessToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { accessToken } = body;
  if (!accessToken) {
    return NextResponse.json({ error: 'accessToken is required' }, { status: 400 });
  }

  await enrollStudentInJourneys(studentId, accessToken);
  return NextResponse.json({ ok: true });
}
