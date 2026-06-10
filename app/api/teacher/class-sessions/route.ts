// POST /api/teacher/class-sessions
// Body: { journeyId: string }
// Records a class activation event and returns the session id + startedAt.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const Body = z.object({ journeyId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'journeyId required' }, { status: 400 });
  }

  const session = await prisma.classSession.create({
    data: { journeyId: parsed.data.journeyId, teacherId },
    select: { id: true, startedAt: true },
  });

  return NextResponse.json(session, { status: 201 });
}
