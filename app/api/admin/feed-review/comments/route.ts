import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: comments, error } = await supabaseAdmin
    .from('feed_edit_comments')
    .select(`
      id, feed_edit_id, author_id, body, moderation_status, created_at,
      feed_edits!inner(hook)
    `)
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    comments: (comments ?? []).map((c: any) => ({
      id: c.id,
      feed_edit_id: c.feed_edit_id,
      edit_hook: c.feed_edits?.hook ?? '',
      body: c.body,
      moderation_status: c.moderation_status,
      created_at: c.created_at,
    })),
  });
}
