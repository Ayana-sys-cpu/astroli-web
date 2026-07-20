import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

// The curated music pack: every file in the feed-music bucket.
// Track names follow {mood}-{name}.mp3 (see music-pack.md).
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data: files, error } = await supabaseAdmin.storage
    .from('feed-music')
    .list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tracks = (files ?? [])
    .filter((f) => /\.(mp3|m4a)$/i.test(f.name))
    .map((f) => ({
      name: f.name.replace(/\.(mp3|m4a)$/i, ''),
      url: supabaseAdmin.storage.from('feed-music').getPublicUrl(f.name).data.publicUrl,
    }));

  return NextResponse.json({ tracks });
}
