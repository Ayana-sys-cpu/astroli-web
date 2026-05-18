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
