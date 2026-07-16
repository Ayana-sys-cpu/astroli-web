import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const editId = req.nextUrl.searchParams.get('edit_id');
  if (!editId) return NextResponse.json({ error: 'edit_id is required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('feed_edit_comments')
    .select('id, author_id, body, moderation_status, created_at')
    .eq('feed_edit_id', editId)
    .or(`moderation_status.eq.approved,author_id.eq.${studentId}`)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    comments: (data ?? []).map((c: any) => ({
      id: c.id,
      body: c.body,
      author_display: 'Student',
      created_at: c.created_at,
      is_own: c.author_id === studentId,
      moderation_status: c.moderation_status,
    })),
  });
}

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.edit_id || !body?.body) {
    return NextResponse.json({ error: 'edit_id and body are required' }, { status: 400 });
  }

  if (body.body.length > 280) {
    return NextResponse.json({ error: 'Comment body must be 280 characters or fewer' }, { status: 400 });
  }

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from('feed_edit_comments')
    .select('id')
    .eq('feed_edit_id', body.edit_id)
    .eq('author_id', studentId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'You have already commented on this edit' },
      { status: 422 },
    );
  }

  const { data: comment, error } = await supabaseAdmin
    .from('feed_edit_comments')
    .insert({
      feed_edit_id: body.edit_id,
      author_id: studentId,
      body: body.body,
      moderation_status: 'pending',
    })
    .select('id, moderation_status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: comment.id, moderation_status: comment.moderation_status }, { status: 201 });
}
