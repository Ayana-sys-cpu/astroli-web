import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { loadDiveSource } from '@/lib/dive-source';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session } = await supabaseAdmin
    .from('master_dive_sessions')
    .select('id, topic, status, origin, edit_id, created_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Ownership is checked here as well as by RLS — a dive is a student's own record.
  const { data: owned } = await supabaseAdmin
    .from('master_dive_sessions')
    .select('id')
    .eq('id', params.id)
    .eq('student_id', studentId)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: messages, error } = await supabaseAdmin
    .from('master_dive_messages')
    .select('role, segments, created_at')
    .eq('session_id', params.id)
    .order('seq', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Could not load that exploration' }, { status: 500 });
  }

  // The edit the dive came from, so the screen can show the student the whole
  // story they only saw a headline of on the card.
  const source = await loadDiveSource(session.edit_id);

  return NextResponse.json({ session, messages: messages ?? [], source: source?.edit ?? null });
}
