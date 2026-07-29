import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { askOrin } from '@/lib/orin-dive';

export const maxDuration = 60;

/**
 * Orin's first message for a dive that was opened before he had written one.
 *
 * Starting a dive only creates the session, so the screen opens instantly; this
 * is what fills it. Idempotent — if an opening already exists it is returned as
 * is, so a reload never produces a second one.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session } = await supabaseAdmin
    .from('master_dive_sessions')
    .select('id, topic, edit_id')
    .eq('id', params.id)
    .eq('student_id', studentId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: existing } = await supabaseAdmin
    .from('master_dive_messages')
    .select('segments')
    .eq('session_id', session.id)
    .order('seq', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return NextResponse.json({ segments: existing.segments });

  const segments = await askOrin({
    topic: session.topic,
    history: [],
    editMedia: await loadEditMedia(session.edit_id),
  });
  if (!segments) return NextResponse.json({ error: 'orin_recharging' }, { status: 503 });

  await supabaseAdmin
    .from('master_dive_messages')
    .insert({ session_id: session.id, role: 'orin', segments });

  return NextResponse.json({ segments }, { status: 201 });
}

/** A dive that started from an edit opens on that edit's own picture. */
async function loadEditMedia(editId: string | null) {
  if (!editId) return null;

  const { data: edit } = await supabaseAdmin
    .from('feed_edits')
    .select('hook, media_url, media_type, media_credit')
    .eq('id', editId)
    .maybeSingle();

  if (!edit?.media_url) return null;
  return {
    url: edit.media_url,
    kind: edit.media_type === 'video' ? ('video' as const) : ('image' as const),
    credit: edit.media_credit ?? 'Astroli',
    title: edit.hook,
  };
}
