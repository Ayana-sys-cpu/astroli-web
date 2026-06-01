// =============================================================================
// /api/teacher/courses
//
// GET — returns the gc_courses list for the authenticated teacher.
// The teacherId comes from the verified session cookie —
// any ?teacherId= query param is intentionally ignored.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('gc_courses')
    .eq('id', teacherId)
    .single();

  if (error || !user) {
    return NextResponse.json({ courses: [] });
  }

  // gc_courses is stored as JSONB — already parsed, no JSON.parse() needed.
  const courses = Array.isArray(user.gc_courses) ? user.gc_courses : [];
  return NextResponse.json({ courses });
}
