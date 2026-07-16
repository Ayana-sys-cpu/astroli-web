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
