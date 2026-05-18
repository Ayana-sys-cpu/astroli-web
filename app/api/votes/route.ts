import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/votes
// Upsert a vote for a student in a journey.
// If the student already voted, their choice is updated.
// Body: { studentId: string, journeyId: string, bigIdeaId: string }
export async function POST(req: NextRequest) {
  let body: { studentId?: string; journeyId?: string; bigIdeaId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { studentId, journeyId, bigIdeaId } = body;
  if (!studentId || !journeyId || !bigIdeaId) {
    return NextResponse.json(
      { error: 'studentId, journeyId, and bigIdeaId are required' },
      { status: 400 },
    );
  }

  try {
    await prisma.vote.upsert({
      where: { studentId_journeyId: { studentId, journeyId } },
      update: { bigIdeaId },
      create: { id: crypto.randomUUID(), studentId, journeyId, bigIdeaId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/votes]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/votes?studentId=&journeyId=
// Returns the big idea the student voted for, or null if they haven't voted.
export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('studentId');
  const journeyId = req.nextUrl.searchParams.get('journeyId');

  if (!studentId || !journeyId) {
    return NextResponse.json(
      { error: 'studentId and journeyId are required' },
      { status: 400 },
    );
  }

  try {
    const vote = await prisma.vote.findUnique({
      where: { studentId_journeyId: { studentId, journeyId } },
      select: { bigIdeaId: true },
    });
    return NextResponse.json({ bigIdeaId: vote?.bigIdeaId ?? null });
  } catch (err) {
    console.error('[GET /api/votes]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
