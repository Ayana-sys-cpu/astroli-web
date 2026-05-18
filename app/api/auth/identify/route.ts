import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();
    if (!accessToken) {
      return NextResponse.json({ error: 'accessToken required' }, { status: 400 });
    }

    // Fetch Google user profile
    const profileRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch Google profile' }, { status: 401 });
    }
    const profile = await profileRes.json();
    const { id: googleId, email, name } = profile;

    // Check Google Classroom: does this user own/teach any courses?
    const classroomRes = await fetch(
      'https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    let isTeacher = false;
    let classroomCourses: any[] = [];

    if (classroomRes.ok) {
      const data = await classroomRes.json();
      classroomCourses = data.courses ?? [];
      isTeacher = classroomCourses.length > 0;
    }
    // 403 means no Classroom access or not a teacher — treat as student

    const role = isTeacher ? 'teacher' : 'student';

    // Upsert user in Prisma with detected role
    const user = await prisma.user.upsert({
      where: { googleId },
      update: { email, name, role },
      create: { googleId, email, name, role },
    });

    return NextResponse.json({
      role,
      userId:    user.id,
      googleId:  user.googleId,
      email:     user.email,
      name:      user.name,
      courses:   isTeacher ? classroomCourses.map((c: any) => ({
        id:    c.id,
        name:  c.name,
        section: c.section ?? null,
      })) : [],
    });
  } catch (err) {
    console.error('[identify]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
