// GET /api/admin/students/[studentId]/conversations?before=<ISO>
//
// Full bot-conversation transcript for one pilot student, chronological,
// limit 500 with an optional `before` cursor for older pages. Reads the
// shared `messages` table through the two-key bridge so rows keyed under
// either historical identity regime stay readable. Founder-only.
// Contract: specs/founder/web-app/pilot-review-dashboard/contracts/admin-api.md

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { messageKeysFor } from '@/lib/student-message-keys';

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { studentId } = params;

  const { data: student } = await supabaseAdmin
    .from('users')
    .select('id, auth_user_id')
    .eq('id', studentId)
    .maybeSingle();
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const messageKeys = messageKeysFor(student);
  if (messageKeys.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  let query = supabaseAdmin
    .from('messages')
    .select('id, role, content, screen_context, speaker, created_at')
    .in('student_id', messageKeys)
    .order('created_at', { ascending: true })
    .limit(500);

  const before = req.nextUrl.searchParams.get('before');
  if (before) {
    query = query.lt('created_at', before);
  }

  const { data: messages, error } = await query;
  if (error) {
    console.error('[admin/students/conversations]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: messages ?? [] });
}
