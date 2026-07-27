import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

/** Shown when a student has no interests and no saves yet — never an empty row. */
const FALLBACK_CHIPS = ['volcanoes', 'space', 'oceans'];
const MAX_CHIPS = 6;

export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const chips: string[] = [];

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('interests')
    .eq('id', studentId)
    .maybeSingle();

  const interests = student?.interests;
  if (Array.isArray(interests)) {
    for (const interest of interests) {
      if (typeof interest === 'string' && interest.trim()) chips.push(interest.trim());
    }
  }

  const { data: saves } = await supabaseAdmin
    .from('master_saves')
    .select('feed_edits(interest_theme)')
    .eq('student_id', studentId)
    .not('edit_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  type SaveRow = { feed_edits: { interest_theme: string | null } | null };
  for (const save of (saves ?? []) as unknown as SaveRow[]) {
    const theme = save.feed_edits?.interest_theme;
    if (theme) chips.push(theme);
  }

  const unique = Array.from(new Set(chips.map((c) => c.toLowerCase()))).slice(0, MAX_CHIPS);
  return NextResponse.json({ chips: unique.length > 0 ? unique : FALLBACK_CHIPS });
}
