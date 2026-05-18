import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  const journeys = await prisma.journey.findMany({
    where: { teacherId },
    include: {
      missions: {
        orderBy: { order: 'asc' },
        select: { id: true, question: true, projectTitle: true, status: true, order: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ journeys });
}

// PATCH /api/teacher/journeys
// Body: { journeyId: string; voteEndsAt: string | null }
// Sets or clears the vote_ends_at timestamp on a journey.
export async function PATCH(req: NextRequest) {
  try {
    const { journeyId, voteEndsAt } = await req.json();
    if (!journeyId) {
      return NextResponse.json({ error: 'journeyId required' }, { status: 400 });
    }
    const journey = await prisma.journey.update({
      where: { id: journeyId },
      data: { voteEndsAt: voteEndsAt ? new Date(voteEndsAt) : null },
      select: { id: true, voteEndsAt: true },
    });
    return NextResponse.json({ journey });
  } catch {
    return NextResponse.json({ error: 'Failed to update journey' }, { status: 500 });
  }
}
