import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_REST_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';
const AVATARS_DIR = path.join(process.cwd(), 'public/avatars/base');
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

async function getExistingBaseAvatar(studentId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}app_students?student_id=eq.${studentId}&select=base_avatar_url`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.base_avatar_url ?? null;
  } catch {
    return null;
  }
}

async function saveBaseAvatar(studentId: string, url: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await fetch(`${SUPABASE_URL}app_students?student_id=eq.${studentId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ base_avatar_url: url }),
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Validate input
  let body: { student_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { student_id } = body;
  if (!student_id) {
    return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
  }

  // Step 1 — Return early if base avatar already assigned
  const existing = await getExistingBaseAvatar(student_id);
  if (existing) {
    return NextResponse.json({ success: true, student_id, base_avatar_url: existing });
  }

  // Step 2 — Pick a random image from the pool
  const avatars = getAvailableAvatars();
  if (avatars.length === 0) {
    return NextResponse.json(
      { error: 'No base avatars found in public/avatars/base/' },
      { status: 500 }
    );
  }
  const filename = avatars[Math.floor(Math.random() * avatars.length)];
  const base_avatar_url = `${AVATARS_BASE_URL}/${filename}`;

  // Save to Supabase
  await saveBaseAvatar(student_id, base_avatar_url);

  // Step 3 — Return immediately, no AI call
  return NextResponse.json({ success: true, student_id, base_avatar_url });
}
