import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get('status') ?? 'draft';

  const { data: edits, error } = await supabaseAdmin
    .from('feed_edits')
    .select(`
      id, edit_type, planet_id, interest_theme,
      hook, body, bridge, media_url, media_credit,
      source_url, safety_pass, safety_reason,
      status, rejection_reason, generated_at,
      planets!inner(title)
    `)
    .eq('status', status)
    .order('generated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count: pendingComments } = await supabaseAdmin
    .from('feed_edit_comments')
    .select('id', { count: 'exact', head: true })
    .eq('moderation_status', 'pending');

  const formatted = (edits ?? []).map((e: any) => ({
    id: e.id,
    edit_type: e.edit_type,
    planet_id: e.planet_id,
    planet_title: e.planets?.title ?? e.planet_id,
    interest_theme: e.interest_theme,
    hook: e.hook,
    body: e.body,
    bridge: e.bridge,
    media_url: e.media_url,
    media_credit: e.media_credit,
    source_url: e.source_url,
    safety_pass: e.safety_pass,
    safety_reason: e.safety_reason,
    status: e.status,
    rejection_reason: e.rejection_reason,
    generated_at: e.generated_at,
  }));

  return NextResponse.json({
    edits: formatted,
    pending_comments: pendingComments ?? 0,
  });
}
