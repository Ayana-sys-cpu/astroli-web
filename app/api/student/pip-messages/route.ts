import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';

interface IncomingMessage {
  role: 'pip' | 'student';
  content: string;
  triggerType: string;
}

// POST /api/student/pip-messages
// Batch-saves Orin guide panel messages (legacy wire name 'pip'). Fire-and-forget from the client.

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let missionId: string | undefined;
  let messages: IncomingMessage[] | undefined;
  try {
    const body = await req.json();
    missionId = body?.missionId;
    messages  = body?.messages;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!missionId || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'missionId and messages are required' }, { status: 400 });
  }

  try {
    const rows = messages.map((m) => ({
      student_id:   studentId,
      mission_id:   missionId as string,
      role:         m.role,
      content:      m.content,
      trigger_type: m.triggerType,
    }));

    const { error } = await supabaseAdmin.from('pip_messages').insert(rows);
    if (error) throw error;

    return NextResponse.json({ saved: rows.length });
  } catch (err) {
    console.error('[pip-messages POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
