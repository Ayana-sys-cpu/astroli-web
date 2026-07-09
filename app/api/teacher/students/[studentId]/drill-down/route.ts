// src/astroli-web/app/api/teacher/students/[studentId]/drill-down/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { getStudentDrillDown } from '@/lib/drill-down';

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

  const result = await getStudentDrillDown(teacherId, studentId);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
