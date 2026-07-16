import { NextRequest, NextResponse } from 'next/server';
import { enrollStudentInJourneys } from '@/lib/enroll-student';
import { resolveStudentIdFromRequest } from '@/lib/auth';
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

function pickAvatarUrl(): string {
  const index = Math.floor(Math.random() * 10) + 1;
  return `/avatars/base/base-${String(index).padStart(2, '0')}.png`;
}

const RegisterSchema = z.object({
  email:          z.string().trim().email('Valid email required'),
  full_name:      z.string().trim().min(1, 'full_name is required'),
  first_name:     z.string().trim().min(1, 'first_name is required'),
  accessToken:    z.string().trim().min(1).optional(),
  apple_user_id:  z.string().trim().min(1).optional(),
});

const PatchStudentSchema = z.object({
  // Accept both relative paths (/avatars/…) and absolute URLs (https://…)
  base_avatar_url: z.string().trim().min(1, 'base_avatar_url is required'),
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
  const { email: rawEmail, full_name, first_name, accessToken, apple_user_id } = parsed.data;
  const email = rawEmail.toLowerCase();

  const userFields: Record<string, unknown> = { email, full_name, first_name, role: 'student' };
  if (apple_user_id) userFields.apple_user_id = apple_user_id;

  const res = await fetch(`${SUPABASE_URL}users?on_conflict=email`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(userFields),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '(unreadable)');
    console.error('[POST /api/student] Supabase error', res.status, text);
    return NextResponse.json({ error: 'Failed to save student' }, { status: 503 });
  }
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]?.id) {
    console.error('[POST /api/student] Unexpected Supabase response shape:', data);
    return NextResponse.json({ error: 'Failed to save student' }, { status: 503 });
  }
  const userId: string = data[0].id;

  // Assign the student's starter avatar. base_avatar_url doubles as the
  // "onboarding complete" marker read by the sign-in routes, so persist it.
  // The guide's name is a constant ("Orin") and is no longer stored per student.
  const baseAvatarUrl = pickAvatarUrl();

  fetch(
    `${SUPABASE_URL}users?id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ base_avatar_url: baseAvatarUrl }),
    },
  ).catch((err) => console.error('[POST /api/student] avatar persist error:', err));

  // Enroll in matching journeys if caller provided a Google access token.
  if (accessToken && userId) {
    enrollStudentInJourneys(userId, accessToken).catch(() => {});
  }

  // Alias id as student_id — client code (onboarding pages) reads this field.
  return NextResponse.json({ student_id: userId, base_avatar_url: baseAvatarUrl });
}

// PATCH /api/student — update alien_name and/or base_avatar_url for the
// authenticated student. The student_id is read from the verified session —
// any student_id supplied in the body is intentionally ignored.
export async function PATCH(req: NextRequest) {
  // Cookie session (web) or verified bearer token (mobile) — the student
  // identity always comes from the credential, never from client input.
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) {
    return NextResponse.json({ error: 'Forbidden: student session required' }, { status: 403 });
  }

  const parsed = await parseBody(req, PatchStudentSchema);
  if (!parsed.ok) return parsed.response;
  const { base_avatar_url } = parsed.data;

  const patch: Record<string, string> = { base_avatar_url };

  console.log('[PATCH /api/student] studentId:', studentId, 'fields:', Object.keys(patch));

  const { data: updated, error } = await supabaseAdmin
    .from('users')
    .update(patch)
    .eq('id', studentId)
    .select('id');

  if (error) {
    console.error('[PATCH /api/student] Supabase error', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 503 });
  }

  console.log('[PATCH /api/student] rows updated:', (updated ?? []).length);
  return NextResponse.json({ ok: true });
}

// DELETE /api/student — permanently delete the authenticated student's account and data.
export async function DELETE(req: NextRequest) {
  if (missingConfig()) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
  }

  // Cookie session (web) or verified bearer token (mobile) — the student
  // identity always comes from the credential, never from client input.
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) {
    return NextResponse.json({ error: 'Forbidden: student session required' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', studentId);

  if (error) {
    console.error('[DELETE /api/student] Supabase error', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 503 });
  }

  console.log('[DELETE /api/student] deleted student:', studentId);
  return NextResponse.json({ ok: true });
}

// GET /api/student?email=... — look up a student by email (or apple_user_id).
// Returns the student record, or null (200) when the email is not found.
// Returns 503 when env vars are missing, 502 when Supabase itself errors —
// so the client can distinguish "not found" from "lookup failed".
//
// This endpoint is unauthenticated (mobile sign-in calls it before any session
// exists), so it must never expose more than the fields the mobile
// StudentRecord consumes — no select=*, no apple_user_id, no role.
const STUDENT_LOOKUP_COLUMNS =
  'id,email,full_name,first_name,base_avatar_url,avatar_url,area_of_interest';

export async function GET(req: NextRequest) {
  if (missingConfig()) {
    console.error('[GET /api/student] Missing SUPABASE_REST_URL or SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
  }

  const rawEmail = req.nextUrl.searchParams.get('email');
  const appleUserId = req.nextUrl.searchParams.get('apple_user_id');
  if (!rawEmail && !appleUserId) {
    return NextResponse.json({ error: 'email or apple_user_id is required' }, { status: 400 });
  }

  const filter = rawEmail
    ? `email=eq.${encodeURIComponent(rawEmail.toLowerCase())}`
    : `apple_user_id=eq.${encodeURIComponent(appleUserId!)}`;

  let res: Response;
  try {
    res = await fetch(
      `${SUPABASE_URL}users?${filter}&select=${STUDENT_LOOKUP_COLUMNS}`,
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
  if (row) row.student_id = row.id;
  return NextResponse.json(row);
}
