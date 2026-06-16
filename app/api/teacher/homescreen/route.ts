import { NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { getHomescreenData } from '@/lib/homescreen';

export type { SpotlightStudent, ClassInsight } from '@/lib/homescreen';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;
  const data = await getHomescreenData(teacherId);
  return NextResponse.json(data);
}
