import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { gcCourses: true },
  });

  if (!user) {
    return NextResponse.json({ courses: [] });
  }

  try {
    const courses = user.gcCourses ? JSON.parse(user.gcCourses) : [];
    return NextResponse.json({ courses });
  } catch {
    return NextResponse.json({ courses: [] });
  }
}
