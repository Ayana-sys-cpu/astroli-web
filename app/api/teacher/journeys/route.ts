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
        select: { id: true, question: true, projectTitle: true, state: true, order: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ journeys });
}

// PATCH /api/teacher/journeys
// Body: { journeyId: string; voteEndsAt: string | null }
// Sets or clears voteEndsAt on the journey.
// When setting: transitions all locked missions to 'voting'.
// When clearing: reverts any 'voting' missions back to 'locked'.
export async function PATCH(req: NextRequest) {
  try {
    const { journeyId, voteEndsAt } = await req.json();
    if (!journeyId) {
      return NextResponse.json({ error: 'journeyId required' }, { status: 400 });
    }

    const parsedEndsAt = voteEndsAt ? new Date(voteEndsAt) : null;

    const [journey] = await prisma.$transaction([
      prisma.journey.update({
        where: { id: journeyId },
        data: { voteEndsAt: parsedEndsAt },
        select: { id: true, voteEndsAt: true },
      }),
      // When opening a vote: all locked missions enter 'voting' state
      // When closing a vote: all voting missions revert to 'locked'
      parsedEndsAt
        ? prisma.mission.updateMany({
            where: { journeyId, state: 'locked' },
            data: { state: 'voting' },
          })
        : prisma.mission.updateMany({
            where: { journeyId, state: 'voting' },
            data: { state: 'locked' },
          }),
    ]);

    return NextResponse.json({ journey });
  } catch {
    return NextResponse.json({ error: 'Failed to update journey' }, { status: 500 });
  }
}
