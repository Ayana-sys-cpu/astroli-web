// =============================================================================
// /api/teacher/courses
//
// GET /api/teacher/courses?teacherId=<uuid>
// Response: { courses: [{ id, name, section }] }
//
// Reads gc_courses from the unified users table (previously read from teachers).
// teacherId is the user_id UUID from the users table.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get('teacherId');
  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('gc_courses')
    .eq('user_id', teacherId)
    .single();

  if (error || !user) {
    return NextResponse.json({ courses: [] });
  }

  // gc_courses is stored as JSONB — already parsed, no JSON.parse() needed.
  const courses = Array.isArray(user.gc_courses) ? user.gc_courses : [];
  return NextResponse.json({ courses });
}
