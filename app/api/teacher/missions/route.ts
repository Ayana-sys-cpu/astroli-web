import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const missionId = req.nextUrl.searchParams.get('id');

  if (missionId) {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { plants: { orderBy: { createdAt: 'asc' } } },
    });
    if (!mission) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ mission });
  }

  const journeyId = req.nextUrl.searchParams.get('journeyId');
  if (!journeyId) {
    return NextResponse.json({ error: 'journeyId or id required' }, { status: 400 });
  }

  const missions = await prisma.mission.findMany({
    where: { journeyId },
    include: { plants: { orderBy: { createdAt: 'asc' } } },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ missions });
}

// PATCH /api/teacher/missions
// Body: { missionId: string; state: MissionState }
export async function PATCH(req: NextRequest) {
  const { missionId, state } = await req.json();
  if (!missionId || !state) {
    return NextResponse.json({ error: 'missionId and state required' }, { status: 400 });
  }

  const mission = await prisma.mission.update({
    where: { id: missionId },
    data: { state },
  });

  return NextResponse.json({ mission });
}
