// POST /api/teacher/signal-acknowledgements
// Body: { studentId: string; journeyId: string; signalType: string; status: 'done' | 'dismissed' }
// Records a teacher done/dismiss action on a spotlight card.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const Body = z.object({
  studentId:  z.string().min(1),
  journeyId:  z.string().min(1),
  signalType: z.enum(['breakthrough', 'grace_completion', 'stuck', 'non_engagement']),
  status:     z.enum(['done', 'dismissed']),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { studentId, journeyId, signalType, status } = parsed.data;
  const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  const ack = await prisma.teacherSignalAcknowledgement.upsert({
    where: {
      unique_signal_ack: { teacherId, studentId, journeyId, signalType },
    },
    update: { status, expiresAt },
    create: { teacherId, studentId, journeyId, signalType, status, expiresAt },
  });

  return NextResponse.json(ack, { status: 201 });
}
