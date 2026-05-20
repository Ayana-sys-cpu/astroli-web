// =============================================================================
// SUPABASE VERSION — /api/teacher/courses
//
// Drop-in replacement for route.ts. Same request/response shape:
//
//   Request:  GET /api/teacher/courses?teacherId=<uuid>
//   Response: { courses: [{ id, name, section }] }
//
// The Prisma version read gcCourses from the user table (a JSON string).
// This version reads gc_courses from the Supabase teachers table (native JSONB).
//
// HOW TO ACTIVATE:
//   Rename this file to route.ts (delete the Prisma route.ts first).
//   Activate AFTER identify/route.ts — teacherId in localStorage must be a
//   Supabase teacher_id by the time this route is called.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  const { data: teacher, error } = await supabaseAdmin
    .from('teachers')
    .select('gc_courses')
    .eq('teacher_id', teacherId)
    .single();

  if (error || !teacher) {
    return NextResponse.json({ courses: [] });
  }

  // gc_courses is stored as JSONB — already parsed, no JSON.parse() needed.
  const courses = Array.isArray(teacher.gc_courses) ? teacher.gc_courses : [];
  return NextResponse.json({ courses });
}
