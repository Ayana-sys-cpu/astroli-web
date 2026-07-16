import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || !['approve', 'reject'].includes(body.action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const newStatus = body.action === 'approve' ? 'approved' : 'rejected';

  const { data, error } = await supabaseAdmin
    .from('feed_edit_comments')
    .update({ moderation_status: newStatus, moderated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('moderation_status')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ moderation_status: data.moderation_status });
}
