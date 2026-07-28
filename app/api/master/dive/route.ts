import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { askOrin } from '@/lib/orin-dive';

export const maxDuration = 60;

const VALID_ORIGINS = new Set(['edit', 'search', 'chip']);
const MAX_TOPIC_LENGTH = 300;

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const origin = body?.origin as string | undefined;
  const editId = body?.edit_id as string | undefined;
  const rawTopic = typeof body?.topic === 'string' ? body.topic.trim() : '';

  if (!origin || !VALID_ORIGINS.has(origin)) {
    return NextResponse.json({ error: 'origin must be edit, search or chip' }, { status: 400 });
  }
  if (origin === 'edit' && !editId) {
    return NextResponse.json({ error: 'edit_id is required for an edit dive' }, { status: 400 });
  }
  if (origin !== 'edit' && !rawTopic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }

  let topic = rawTopic.slice(0, MAX_TOPIC_LENGTH);
  let editMedia = null;

  if (origin === 'edit') {
    const { data: edit } = await supabaseAdmin
      .from('feed_edits')
      .select('id, hook, media_url, media_type, media_credit')
      .eq('id', editId!)
      .maybeSingle();
    if (!edit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    topic = edit.hook;
    if (edit.media_url) {
      editMedia = {
        url: edit.media_url,
        kind: edit.media_type === 'video' ? ('video' as const) : ('image' as const),
        credit: edit.media_credit ?? 'Astroli',
        title: edit.hook,
      };
    }

    // One live conversation per saved edit — reopening resumes where they left off.
    const { data: existing } = await supabaseAdmin
      .from('master_dive_sessions')
      .select('id, topic, status')
      .eq('student_id', studentId)
      .eq('edit_id', editId!)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { data: opening } = await supabaseAdmin
        .from('master_dive_messages')
        .select('segments')
        .eq('session_id', existing.id)
        .eq('role', 'orin')
        .order('seq', { ascending: true })
        .limit(1)
        .maybeSingle();
      return NextResponse.json({
        session: existing,
        opening: { segments: opening?.segments ?? [] },
      });
    }
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('master_dive_sessions')
    .insert({ student_id: studentId, origin, edit_id: editId ?? null, topic })
    .select('id, topic, status')
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Could not start that exploration' }, { status: 500 });
  }

  const segments = await askOrin({ topic, history: [], editMedia });
  if (!segments) {
    return NextResponse.json({ error: 'orin_recharging', session }, { status: 503 });
  }

  await supabaseAdmin
    .from('master_dive_messages')
    .insert({ session_id: session.id, role: 'orin', segments });

  return NextResponse.json({ session, opening: { segments } }, { status: 201 });
}
