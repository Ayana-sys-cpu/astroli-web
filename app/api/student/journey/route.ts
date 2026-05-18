import { NextResponse } from 'next/server';
import { PrismaClient, MissionState } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/student/journey
// Returns current routing state for the student:
//   hasActiveJourney — any mission is 'active' → student goes to /landscape
//   hasActiveVote    — any mission is 'voting' AND journey.voteEndsAt is in the future → student goes to /vote
//   both false       → student goes to /pending-journey
export async function GET() {
  try {
    // 1. Active mission check
    const activeMission = await prisma.mission.findFirst({
      where: { state: MissionState.active },
      select: { id: true },
    });
    if (activeMission) {
      return NextResponse.json({ hasActiveJourney: true, hasActiveVote: false });
    }

    // 2. Active vote check — mission in 'voting' state AND journey voteEndsAt is in the future
    const now = new Date();
    const votingMission = await prisma.mission.findFirst({
      where: { state: MissionState.voting },
      select: {
        id: true,
        journey: {
          select: {
            id: true,
            voteEndsAt: true,
            missions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                question: true,
                projectTitle: true,
                projectDescription: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (votingMission && votingMission.journey.voteEndsAt && votingMission.journey.voteEndsAt > now) {
      return NextResponse.json({
        hasActiveJourney: false,
        hasActiveVote: true,
        voteJourneyId: votingMission.journey.id,
        voteEndsAt: votingMission.journey.voteEndsAt,
        voteMissions: votingMission.journey.missions,
      });
    }

    return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
  } catch {
    return NextResponse.json({ hasActiveJourney: false, hasActiveVote: false });
  }
}
