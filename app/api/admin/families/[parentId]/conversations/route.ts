// GET /api/admin/families/[parentId]/conversations
//
// Returns the bot conversation history for a parent's linked child.
// Founder-only (ADMIN_EMAIL env var).
//
// Response: 200 { conversations: MessageRow[] }
//           403 — not admin / no linked child

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: { parentId: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { parentId } = params;

  // Find linked child
  const { data: link } = await supabaseAdmin
    .from('parent_child_link')
    .select('child_id')
    .eq('parent_id', parentId)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ conversations: [] });
  }

  // Fetch messages from the bot's messages table
  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('id, role, content, screen_context, created_at')
    .eq('student_id', link.child_id)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) {
    console.error('[admin/families/conversations]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: messages ?? [] });
}
