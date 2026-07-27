import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

interface SaveRow {
  id: string;
  edit_id: string | null;
  dive_session_id: string | null;
  created_at: string;
  feed_edits: { hook: string; media_url: string | null; media_type: string | null } | null;
  master_dive_sessions: { topic: string } | null;
}

function toTile(row: SaveRow) {
  const isEdit = row.edit_id !== null;
  return {
    id: row.id,
    kind: isEdit ? 'edit' : 'dive',
    title: isEdit ? row.feed_edits?.hook ?? 'Saved edit' : row.master_dive_sessions?.topic ?? 'Deep dive',
    cover_url: isEdit ? row.feed_edits?.media_url ?? null : null,
    has_video: isEdit ? row.feed_edits?.media_type === 'video' : false,
    edit_id: row.edit_id,
    dive_session_id: row.dive_session_id,
    created_at: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('master_saves')
    .select('id, edit_id, dive_session_id, created_at, feed_edits(hook, media_url, media_type), master_dive_sessions(topic)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Could not load your saves' }, { status: 500 });
  }

  return NextResponse.json({ saves: (data as unknown as SaveRow[]).map(toTile) });
}

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const editId = body?.edit_id as string | undefined;
  const diveSessionId = body?.dive_session_id as string | undefined;

  if (!editId === !diveSessionId) {
    return NextResponse.json(
      { error: 'Provide exactly one of edit_id or dive_session_id' },
      { status: 400 },
    );
  }

  const target = editId
    ? { column: 'edit_id' as const, value: editId }
    : { column: 'dive_session_id' as const, value: diveSessionId! };

  // A dive can only be saved by the student who owns it.
  if (diveSessionId) {
    const { data: session } = await supabaseAdmin
      .from('master_dive_sessions')
      .select('id')
      .eq('id', diveSessionId)
      .eq('student_id', studentId)
      .maybeSingle();
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('master_saves')
    .insert({ student_id: studentId, [target.column]: target.value })
    .select('id, edit_id, dive_session_id, created_at')
    .single();

  // 23505 = already saved. Saving twice is a no-op, not an error.
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }

  if (error) {
    const { data: existing } = await supabaseAdmin
      .from('master_saves')
      .select('id, edit_id, dive_session_id, created_at')
      .eq('student_id', studentId)
      .eq(target.column, target.value)
      .maybeSingle();
    return NextResponse.json({ save: existing }, { status: 200 });
  }

  return NextResponse.json({ save: inserted }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const id = params.get('id');
  const editId = params.get('edit_id');
  const diveSessionId = params.get('dive_session_id');

  if (!id && !editId && !diveSessionId) {
    return NextResponse.json(
      { error: 'Provide id, edit_id or dive_session_id' },
      { status: 400 },
    );
  }

  let query = supabaseAdmin.from('master_saves').delete().eq('student_id', studentId);
  if (id) query = query.eq('id', id);
  else if (editId) query = query.eq('edit_id', editId);
  else query = query.eq('dive_session_id', diveSessionId!);

  const { data, error } = await query.select('id');

  if (error) {
    return NextResponse.json({ error: 'Could not remove that save' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
