import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/winner?journeyId=
// Tallies all votes for a journey and returns the winning big idea ID.
// Tie-break: alphabetically lowest ID wins — deterministic across all devices.
// Returns { winnerId: string | null } — null if no votes have been cast yet.
export async function GET(req: NextRequest) {
  const journeyId = req.nextUrl.searchParams.get('journeyId');
  if (!journeyId) {
    return NextResponse.json({ error: 'journeyId is required' }, { status: 400 });
  }

  try {
    const rows = await prisma.vote.groupBy({
      by: ['bigIdeaId'],
      where: { journeyId },
      _count: { bigIdeaId: true },
      orderBy: [
        { _count: { bigIdeaId: 'desc' } },
        { bigIdeaId: 'asc' },  // deterministic tie-break
      ],
    });

    const winnerId = rows[0]?.bigIdeaId ?? null;
    return NextResponse.json({ winnerId });
  } catch (err) {
    console.error('[GET /api/winner]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
