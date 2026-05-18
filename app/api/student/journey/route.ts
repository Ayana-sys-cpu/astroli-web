import { NextResponse } from 'next/server';
import { PrismaClient, MissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/student/journey
// Phase 1: returns { hasActiveJourney: true } if any mission is ACTIVE in the DB.
// Phase 2: will scope this query to the student's enrolled teacher.
export async function GET() {
  try {
    const activeMission = await prisma.mission.findFirst({
      where: { status: MissionStatus.ACTIVE },
      select: { id: true },
    });
    return NextResponse.json({ hasActiveJourney: !!activeMission });
  } catch {
    return NextResponse.json({ hasActiveJourney: false });
  }
}
