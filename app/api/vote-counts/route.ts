import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/vote-counts?journeyId=
// Returns aggregated vote counts per big idea for a journey.
// Response: { counts: { [bigIdeaId]: number } }
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
    });

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.bigIdeaId] = row._count.bigIdeaId;
    }

    return NextResponse.json({ counts });
  } catch (err) {
    console.error('[GET /api/vote-counts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
