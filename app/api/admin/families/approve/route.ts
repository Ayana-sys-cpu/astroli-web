// POST /api/admin/families/approve
//
// Approves a waitlisted parent email by inserting into authorized_parents.
// Founder-only (ADMIN_EMAIL env var).
//
// Request:  POST { email: string }
// Response: 200 { ok: true }
//           400 — missing email
//           409 — already approved

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { z, parseBody } from '@/lib/validate';

const Schema = z.object({
  email: z.string().email('valid email required'),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, Schema);
  if (!parsed.ok) return parsed.response;
  const { email } = parsed.data;

  const { error } = await supabaseAdmin
    .from('authorized_parents')
    .insert({ email: email.toLowerCase() });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already approved' }, { status: 409 });
    }
    console.error('[admin/families/approve]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
