import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { provisionTeacherJourneys } from '@/lib/provision-teacher';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { teacherId, courses } = await req.json();
    if (!teacherId || !Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json({ error: 'teacherId and courses required' }, { status: 400 });
    }

    const journeyId = await provisionTeacherJourneys(teacherId, courses, prisma);

    return NextResponse.json({ ok: true, journeyId });
  } catch (err) {
    console.error('[teacher/connect]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
