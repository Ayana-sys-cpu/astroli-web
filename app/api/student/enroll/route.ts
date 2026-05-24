import { NextRequest, NextResponse } from 'next/server';
import { enrollStudentInJourneys } from '@/lib/enroll-student';

// POST /api/student/enroll
// Called by the mobile app after a student signs in (both new and returning).
// Looks up the student's Google Classroom courses and upserts matching rows
// into student_journeys so the student sees their teacher's journeys.
//
// Body: { studentId: string; accessToken: string }
export async function POST(req: NextRequest) {
  let body: { studentId?: string; accessToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { studentId, accessToken } = body;
  if (!studentId || !accessToken) {
    return NextResponse.json({ error: 'studentId and accessToken are required' }, { status: 400 });
  }

  await enrollStudentInJourneys(studentId, accessToken);
  return NextResponse.json({ ok: true });
}
