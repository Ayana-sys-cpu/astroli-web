import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth, assertStudentSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const BASE_URL     = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';
const AVATARS_DIR  = path.join(process.cwd(), 'public/avatars/base');
const AVATARS_BASE_URL = `${BASE_URL}/avatars/base`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAvailableAvatars(): string[] {
  try {
    return fs
      .readdirSync(AVATARS_DIR)
      .filter((f) => f.endsWith('.png'))
      .sort();
  } catch {
    return [];
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

// POST /api/avatar/base
// Assigns a random base avatar to the authenticated student if one is not
// already set. The student_id comes from the verified session cookie —
// any student_id in the request body is intentionally ignored.
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertStudentSession(auth.user);
  if (sessionError) return sessionError;

  const studentId = auth.user.user_metadata.student_id as string;

  // Step 1 — Return early if base avatar already assigned.
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('base_avatar_url')
    .eq('id', studentId)
    .maybeSingle();

  if (existing?.base_avatar_url) {
    return NextResponse.json({ success: true, base_avatar_url: existing.base_avatar_url });
  }

  // Step 2 — Pick a random image from the pool.
  const avatars = getAvailableAvatars();
  if (avatars.length === 0) {
    return NextResponse.json(
      { error: 'No base avatars found in public/avatars/base/' },
      { status: 500 },
    );
  }
  const filename = avatars[Math.floor(Math.random() * avatars.length)];
  const base_avatar_url = `${AVATARS_BASE_URL}/${filename}`;

  // Step 3 — Persist and return.
  const { error } = await supabaseAdmin
    .from('users')
    .update({ base_avatar_url })
    .eq('id', studentId);

  if (error) {
    console.error('[POST /api/avatar/base] Supabase error', error);
    return NextResponse.json({ error: 'Failed to save avatar' }, { status: 503 });
  }

  return NextResponse.json({ success: true, base_avatar_url });
}
