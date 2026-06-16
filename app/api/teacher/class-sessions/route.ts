// POST /api/teacher/class-sessions
// Body: { journeyId: string } — actually a classes.id, kept as the wire field
// name for frontend backward compatibility. Records a class activation event
// and returns the session id + startedAt.
// See docs/architecture/2026-06-16-journeys-classes-redesign.md.

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
  const classId = parsed.data.journeyId;

  const klass = await prisma.class.findFirst({
    where: { id: classId, teacherId },
    select: { journeyId: true },
  });
  if (!klass) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // journeyId is still required (NOT NULL FK into journeys until the cleanup
  // migration runs) — it gets the class's template id, the only valid value
  // for that column now. classId is the real "which class" answer.
  const session = await prisma.classSession.create({
    data: { journeyId: klass.journeyId, classId, teacherId },
    select: { id: true, startedAt: true },
  });

  return NextResponse.json(session, { status: 201 });
}
