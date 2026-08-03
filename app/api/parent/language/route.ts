// POST /api/parent/language
//
// Sets the calling parent's language, and mirrors it onto their linked child so
// the pair stays in one language (spec: specs/shared/language/spec.md).
//
// Called from the first step of parent onboarding, before anything else is set
// up, so the rest of onboarding renders in the chosen language.
//
// Request:  POST { language: 'en' | 'he' }
// Response: 200 { ok: true, language }
//           400 — unsupported language
//           401 — no session
//           403 — not a parent session

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth } from '@/lib/auth';
import { resolveParentId } from '@/lib/parent-auth';
import { z, parseBody } from '@/lib/validate';

const Schema = z.object({
  language: z.enum(['en', 'he']),
  // IANA name from the browser. Optional: an older client won't send it, and
  // the column already defaults to Asia/Jerusalem for the pilot cohort.
  timezone: z.string().min(1).max(64).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parentId = resolveParentId(auth.user);
  if (!parentId) {
    return NextResponse.json({ error: 'Forbidden: parent session required' }, { status: 403 });
  }

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.response;
  const { language, timezone } = parsed.data;

  const { error } = await supabaseAdmin
    .from('users')
    .update(timezone ? { language, timezone } : { language })
    .eq('id', parentId);

  if (error) {
    console.error('[parent/language] update error:', error);
    return NextResponse.json({ error: 'Failed to save language' }, { status: 500 });
  }

  // Keep the pair in step. A child linked before the parent changed their mind
  // would otherwise keep the old language forever — nothing else ever revisits
  // it. Children linked later inherit at invite acceptance instead.
  const { data: link } = await supabaseAdmin
    .from('parent_child_link')
    .select('child_id')
    .eq('parent_id', parentId)
    .maybeSingle();

  if (link?.child_id) {
    await supabaseAdmin.from('users').update({ language }).eq('id', link.child_id);
  }

  return NextResponse.json({ ok: true, language });
}
