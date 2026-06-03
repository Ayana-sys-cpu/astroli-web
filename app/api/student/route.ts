import { NextRequest, NextResponse } from 'next/server';
import { enrollStudentInJourneys } from '@/lib/enroll-student';
import { requireAuth, resolveStudentId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { z, parseBody } from '@/lib/validate';

const SUPABASE_URL = process.env.SUPABASE_REST_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const supabaseHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
});

function missingConfig(): boolean {
  return !SUPABASE_URL || !SUPABASE_KEY;
}

const FALLBACK_PREFIXES = ['Xylo', 'Kael', 'Zyr', 'Vor', 'Nexo', 'Ael', 'Crix', 'Thal', 'Grix', 'Oru', 'Vex', 'Nyx', 'Zara', 'Phos', 'Quill'];
const FALLBACK_SUFFIXES = ['-9', '-Flux', '-Prime', '-Zyx', '-Omni', '-Sol', '-Nix', '-Ren', '-X', '-Pulse', '-Arc', '-Zero'];

function fallbackAlienName(): string {
  const p = FALLBACK_PREFIXES[Math.floor(Math.random() * FALLBACK_PREFIXES.length)];
  const s = FALLBACK_SUFFIXES[Math.floor(Math.random() * FALLBACK_SUFFIXES.length)];
  return p + s;
}

async function generateAlienName(): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackAlienName();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16,
        messages: [{
          role: 'user',
          content: "Invent one unique sci-fi alien name for a student's avatar companion in a space learning game. One word, 5–10 characters, kid-friendly, memorable, no real words. Reply with ONLY the name.",
        }],
      }),
    });
    if (!res.ok) return fallbackAlienName();
    const json = await res.json();
    const name = (json.content?.[0]?.text ?? '').trim().replace(/[^A-Za-z0-9\-]/g, '');
    return name.length >= 3 && name.length <= 20 ? name : fallbackAlienName();
  } catch {
    return fallbackAlienName();
  }
}

function pickAvatarUrl(): string {
  const index = Math.floor(Math.random() * 10) + 1;
  return `/avatars/base/base-${String(index).padStart(2, '0')}.png`;
}

const RegisterSchema = z.object({
  email:       z.string().trim().email('Valid email required'),
  full_name:   z.string().trim().min(1, 'full_name is required'),
  first_name:  z.string().trim().min(1, 'first_name is required'),
  accessToken: z.string().trim().min(1, 'accessToken is required'),
});

const PatchStudentSchema = z.object({
  alien_name:      z.string().trim().min(1).max(50).optional(),
  // Accept both relative paths (/avatars/…) and absolute URLs (https://…)
  base_avatar_url: z.string().trim().min(1).optional(),
}).refine(d => d.alien_name || d.base_avatar_url, {
  message: 'At least one of alien_name or base_avatar_url is required',
});

// POST /api/student — register a new student, generate their alien identity,
// persist it to the DB, and return it so the client can cache it immediately.
export async function POST(req: NextRequest) {
  if (missingConfig()) {
    console.error('[POST /api/student] Missing SUPABASE_REST_URL or SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
  }

  const parsed = await parseBody(req, RegisterSchema);
  if (!parsed.ok) return parsed.response;
  const { email: rawEmail, full_name, first_name, accessToken } = parsed.data;
  const email = rawEmail.toLowerCase();

  const res = await fetch(`${SUPABASE_URL}users?on_conflict=email`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ email, full_name, first_name, role: 'student' }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '(unreadable)');
    console.error('[POST /api/student] Supabase error', res.status, text);
    return NextResponse.json({ error: 'Failed to save student' }, { status: 503 });
  }
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]?.user_id) {
    console.error('[POST /api/student] Unexpected Supabase response shape:', data);
    return NextResponse.json({ error: 'Failed to save student' }, { status: 503 });
  }
  const userId: string = data[0].user_id;

  // Generate alien identity and persist it. Fire-and-forget the Supabase
  // write but await the name so we can return it to the client immediately.
  const [alienName, baseAvatarUrl] = await Promise.all([
    generateAlienName(),
    Promise.resolve(pickAvatarUrl()),
  ]);

  fetch(
    `${SUPABASE_URL}users?user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ alien_name: alienName, base_avatar_url: baseAvatarUrl }),
    },
  ).catch((err) => console.error('[POST /api/student] identity persist error:', err));

  // Enroll in matching journeys if caller provided a Google access token.
  if (accessToken && userId) {
    enrollStudentInJourneys(userId, accessToken).catch(() => {});
  }

  // Alias user_id as student_id — client code (onboarding pages) reads this field.
  return NextResponse.json({ student_id: userId, alien_name: alienName, base_avatar_url: baseAvatarUrl });
}

// PATCH /api/student — update alien_name and/or base_avatar_url for the
// authenticated student. The student_id is read from the verified session —
// any student_id supplied in the body is intentionally ignored.
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const studentId = await resolveStudentId(auth.user);
  if (!studentId) {
    return NextResponse.json({ error: 'Forbidden: student session required' }, { status: 403 });
  }

  const parsed = await parseBody(req, PatchStudentSchema);
  if (!parsed.ok) return parsed.response;
  const { alien_name, base_avatar_url } = parsed.data;

  const patch: Record<string, string> = {};
  if (alien_name)       patch.alien_name      = alien_name;
  if (base_avatar_url)  patch.base_avatar_url = base_avatar_url;

  console.log('[PATCH /api/student] studentId:', studentId, 'fields:', Object.keys(patch));

  const { error, count } = await supabaseAdmin
    .from('users')
    .update(patch)
    .eq('id', studentId)
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('[PATCH /api/student] Supabase error', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 503 });
  }

  console.log('[PATCH /api/student] rows updated:', count);
  return NextResponse.json({ ok: true });
}

// GET /api/student?email=... — look up a student by email.
// Returns the student record, or null (200) when the email is not found.
// Returns 503 when env vars are missing, 502 when Supabase itself errors —
// so the client can distinguish "not found" from "lookup failed".
export async function GET(req: NextRequest) {
  if (missingConfig()) {
    console.error('[GET /api/student] Missing SUPABASE_REST_URL or SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
  }

  const rawEmail = req.nextUrl.searchParams.get('email');
  if (!rawEmail) return NextResponse.json({ error: 'email is required' }, { status: 400 });
  const email = rawEmail.toLowerCase();

  let res: Response;
  try {
    res = await fetch(
      `${SUPABASE_URL}users?email=eq.${encodeURIComponent(email)}&select=*`,
      { headers: supabaseHeaders() },
    );
  } catch (err) {
    console.error('[GET /api/student] Network error reaching Supabase:', err);
    return NextResponse.json({ error: 'Database unreachable' }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[GET /api/student] Supabase error', res.status, body);
    return NextResponse.json({ error: 'Database lookup failed', detail: body }, { status: 502 });
  }

  const rows = await res.json();
  const row = rows?.[0] ?? null;
  // Alias user_id as student_id for backwards compat with client code.
  if (row) row.student_id = row.user_id;
  return NextResponse.json(row);
}
