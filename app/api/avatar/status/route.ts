import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

const SUPABASE_URL = process.env.SUPABASE_REST_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Returns a signed URL valid for 1 hour from a Cloudinary public_id
function signedUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    secure: true,
  });
}

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('student_id');
  if (!studentId) {
    return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ ready: false, avatar_url: null });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}app_students?student_id=eq.${studentId}&select=avatar_url`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return NextResponse.json({ ready: false, avatar_url: null });

    const data = await res.json();
    const stored: string | null = data?.[0]?.avatar_url ?? null;

    if (!stored) return NextResponse.json({ ready: false, avatar_url: null });

    // If stored value is a public_id (avatars/final/...), generate a signed URL.
    // If it's a fallback public URL (http://...), return it as-is.
    const avatarUrl = stored.startsWith('avatars/')
      ? signedUrl(stored)
      : stored;

    return NextResponse.json({ ready: true, avatar_url: avatarUrl });
  } catch {
    return NextResponse.json({ ready: false, avatar_url: null });
  }
}
