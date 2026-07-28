import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { askOrin, type DiveTurn, type Segment } from '@/lib/orin-dive';

export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 1000;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

  const { data: session } = await supabaseAdmin
    .from('master_dive_sessions')
    .select('id, topic, edit_id')
    .eq('id', params.id)
    .eq('student_id', studentId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: history } = await supabaseAdmin
    .from('master_dive_messages')
    .select('role, segments')
    .eq('session_id', session.id)
    .order('seq', { ascending: true });

  const studentSegments: Segment[] = [{ type: 'text', text: text.slice(0, MAX_MESSAGE_LENGTH) }];

  const { error: insertError } = await supabaseAdmin
    .from('master_dive_messages')
    .insert({ session_id: session.id, role: 'student', segments: studentSegments });
  if (insertError) {
    return NextResponse.json({ error: 'Could not send that' }, { status: 500 });
  }

  const turns: DiveTurn[] = [
    ...((history ?? []) as DiveTurn[]),
    { role: 'student', segments: studentSegments },
  ];

  const reply = await askOrin({ topic: session.topic, history: turns });
  if (!reply) {
    return NextResponse.json({ error: 'orin_recharging' }, { status: 503 });
  }

  await supabaseAdmin
    .from('master_dive_messages')
    .insert({ session_id: session.id, role: 'orin', segments: reply });

  await supabaseAdmin
    .from('master_dive_sessions')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', session.id);

  return NextResponse.json({ reply: { segments: reply } });
}
