// POST /api/leads
// Public endpoint — captures free-trial signup requests from the marketing
// landing page (app/welcome). No auth: anyone can submit their own contact
// info, same as any marketing lead form.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { z } from 'zod';

const Body = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  childName: z.string().trim().min(1).max(200),
  childEmail: z.string().trim().email().max(320).optional(),
  childGender: z.enum(['girl', 'boy', 'non-binary', 'prefer_not_to_say']).optional(),
  grade2027: z.enum(['grade_7', 'grade_8', 'grade_9', 'grade_10']).optional(),
  school: z.string().trim().max(200).optional(),
  referralSource: z.enum(['teacher', 'social_media', 'friend', 'search', 'other']).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }
  const { name, email, childName, childEmail, childGender, grade2027, school, referralSource } = parsed.data;

  const { error } = await supabaseAdmin.from('trial_leads').insert({
    name,
    email,
    child_name: childName,
    child_email: childEmail ?? null,
    child_gender: childGender ?? null,
    grade_2027: grade2027 ?? null,
    school: school ?? null,
    referral_source: referralSource ?? null,
    role: 'parent',
    source: 'welcome_page_parent',
  });

  if (error) {
    console.error('[POST /api/leads]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
