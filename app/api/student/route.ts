import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_REST_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const headers = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
});

// POST /api/student — upsert a student record, return student_id
export async function POST(req: NextRequest) {
  const { email, full_name, first_name } = await req.json();
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const res = await fetch(`${SUPABASE_URL}app_students?on_conflict=email`, {
    method: 'POST',
    headers: {
      ...headers(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ email, full_name, first_name }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json({ student_id: data[0].student_id });
}

// GET /api/student?email=... — look up a student by email
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const res = await fetch(
    `${SUPABASE_URL}app_students?email=eq.${encodeURIComponent(email)}&select=*`,
    { headers: headers() }
  );

  if (!res.ok) return NextResponse.json(null);
  const data = await res.json();
  return NextResponse.json(data?.[0] ?? null);
}
