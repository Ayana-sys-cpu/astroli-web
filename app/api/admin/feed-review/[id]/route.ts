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
  if (!body) return NextResponse.json({ error: 'JSON body required' }, { status: 400 });

  // Music-only update: assign a pack track (or null = silent card) without
  // touching the review status.
  if (!body.action && 'music_url' in body) {
    if (body.music_url !== null && typeof body.music_url !== 'string') {
      return NextResponse.json({ error: 'music_url must be a string or null' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('feed_edits')
      .update({ music_url: body.music_url })
      .eq('id', params.id)
      .select('music_url')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ music_url: data.music_url });
  }

  if (!['approve', 'reject'].includes(body.action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const newStatus = body.action === 'approve' ? 'live' : 'rejected';
  const update: Record<string, unknown> = { status: newStatus };
  if (body.action === 'reject' && body.reason) {
    update.rejection_reason = body.reason;
  }

  const { data, error } = await supabaseAdmin
    .from('feed_edits')
    .update(update)
    .eq('id', params.id)
    .select('status')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ status: data.status });
}
