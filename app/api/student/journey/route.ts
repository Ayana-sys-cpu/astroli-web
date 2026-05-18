import { NextResponse } from 'next/server';
import { PrismaClient, MissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/student/journey
// Returns the current state a student should see:
//   { hasActiveJourney, hasActiveVote, voteJourneyId, voteEndsAt, voteMissions }
// Phase 1: un-scoped — checks across all journeys (single teacher/class setup).
export async function GET() {
  try {
    // Check for an active mission first
    const activeMission = await prisma.mission.findFirst({
      where: { status: MissionStatus.ACTIVE },
      select: { id: true },
    });

    if (activeMission) {
      return NextResponse.json({ hasActiveJourney: true, hasActiveVote: false });
    }

    // Check for a journey with an active vote (voteEndsAt is set and in the future)
    const now = new Date();
    const voteJourney = await prisma.journey.findFirst({
      where: { voteEndsAt: { gt: now } },
      select: {
        id: true,
        voteEndsAt: true,
        missions: {
          orderBy: { order: 'asc' },
          select: { id: true, question: true, projectTitle: true, projectDescription: true, order: true },
        },
      },
    });

    if (voteJourney) {
      return NextResponse.json({
        hasActiveJourney: false,
        hasActiveVote: true,
        voteJourneyId: voteJourney.id,
        voteEndsAt: voteJourney.voteEndsAt,
        voteMissions: voteJourney.missions,
      });
    }

    return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
  } catch {
    return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
  }
}
