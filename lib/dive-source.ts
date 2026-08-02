import { supabaseAdmin } from './supabase-server';
import type { SourceEdit } from './orin-dive';

export interface DiveSource {
  /** The story the student read — what Orin builds on. */
  edit: SourceEdit;
  /** The edit's own cover, offered as the dive's opening visual. */
  media: { url: string; kind: 'image' | 'video'; credit: string; title: string } | null;
}

/**
 * The edit a dive started from. Every dive endpoint loads it the same way, so
 * Orin always has the real names and facts the student already read — not just
 * the headline.
 */
export async function loadDiveSource(editId: string | null | undefined): Promise<DiveSource | null> {
  if (!editId) return null;

  const { data: edit } = await supabaseAdmin
    .from('feed_edits')
    .select('hook, body, bridge, media_url, media_type, media_credit')
    .eq('id', editId)
    .maybeSingle();
  if (!edit) return null;

  return {
    edit: { hook: edit.hook, body: edit.body, bridge: edit.bridge },
    media: edit.media_url
      ? {
          url: edit.media_url,
          kind: edit.media_type === 'video' ? 'video' : 'image',
          credit: edit.media_credit ?? 'Astroli',
          title: edit.hook,
        }
      : null,
  };
}
