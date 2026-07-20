import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

// Podcast audio upload — the manual path (founder exports from NotebookLM).
// Stored in our own bucket so students never touch a third-party player (COPPA).

const MAX_BYTES = 50 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'multipart field "file" is required' }, { status: 400 });
  }

  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported audio type "${file.type}" — use MP3 or M4A` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 400 });
  }

  const { data: edit } = await supabaseAdmin
    .from('feed_edits')
    .select('id')
    .eq('id', params.id)
    .maybeSingle();
  if (!edit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const path = `${params.id}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from('feed-audio')
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from('feed-audio').getPublicUrl(path);
  const audioUrl = pub.publicUrl;

  const { error: updateError } = await supabaseAdmin
    .from('feed_edits')
    .update({ audio_url: audioUrl, audio_status: 'ready' })
    .eq('id', params.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ audio_url: audioUrl });
}

// Remove a card's podcast (mistaken upload) — clears the button for students.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  await supabaseAdmin.storage
    .from('feed-audio')
    .remove([`${params.id}.mp3`, `${params.id}.m4a`]);

  const { data, error } = await supabaseAdmin
    .from('feed_edits')
    .update({ audio_url: null, audio_status: null })
    .eq('id', params.id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ audio_url: null });
}
