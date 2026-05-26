import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v2 as cloudinary } from 'cloudinary';
import { translateInterest } from '@/lib/translateInterest';
import fs from 'fs';
import path from 'path';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SUPABASE_URL = process.env.SUPABASE_REST_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ── Helpers: base image ───────────────────────────────────────────────────────

// Picks a deterministic base image (1–10) from the student UUID
function pickBaseIndex(studentId: string): number {
  const sum = Array.from(studentId.replace(/-/g, '')).reduce((a, c) => a + c.charCodeAt(0), 0);
  return (sum % 10) + 1;
}

function getBaseImageFile(studentId: string): File {
  const index = pickBaseIndex(studentId);
  const filename = `base-${String(index).padStart(2, '0')}.png`;
  const filePath = path.join(process.cwd(), 'public', 'avatars', 'base', filename);
  const buffer = fs.readFileSync(filePath);
  return new File([buffer], filename, { type: 'image/png' });
}

// ── Helpers: Supabase ─────────────────────────────────────────────────────────

async function patchStudent(studentId: string, fields: Record<string, unknown>): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await fetch(`${SUPABASE_URL}users?user_id=eq.${encodeURIComponent(studentId)}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(fields),
  });
}

async function clearAvatarUrl(studentId: string): Promise<void> {
  await patchStudent(studentId, { avatar_url: null });
}

async function saveAvatarPublicId(studentId: string, publicId: string): Promise<void> {
  await patchStudent(studentId, { avatar_url: publicId });
}

// ── Helpers: image ────────────────────────────────────────────────────────────

async function uploadPrivate(b64: string, publicId: string): Promise<void> {
  await cloudinary.uploader.upload(`data:image/png;base64,${b64}`, {
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
    type: 'authenticated',
  });
}

async function uploadPrivateWithRetry(b64: string, publicId: string): Promise<void> {
  try {
    await uploadPrivate(b64, publicId);
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
    await uploadPrivate(b64, publicId);
  }
}

function signedUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    secure: true,
  });
}

async function isImageSafe(url: string): Promise<boolean> {
  try {
    const result = await client.moderations.create({
      model: 'omni-moderation-latest',
      input: [{ type: 'image_url', image_url: { url } }],
    });
    return !result.results[0]?.flagged;
  } catch {
    return true;
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { student_id?: string; area_of_interest?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { student_id, area_of_interest } = body;
  if (!student_id || !area_of_interest) {
    return NextResponse.json(
      { error: 'student_id and area_of_interest are required' },
      { status: 400 }
    );
  }

  const publicId = `avatars/final/${student_id}`;

  // Persist interest immediately — this is the server-side source of truth for
  // "onboarding complete". Doing it here (before generation) ensures the DB is
  // updated even if the avatar pipeline fails or times out.
  await patchStudent(student_id, { area_of_interest });

  await clearAvatarUrl(student_id);

  try {
    const personalisationDesc = await translateInterest(area_of_interest);

    const baseImage = getBaseImageFile(student_id);

    const prompt =
      `Keep this cute baby alien creature's exact body shape, face, big sparkly eyes, soft fluffy fur, and overall character identical. ` +
      `The alien is now ${personalisationDesc}. ` +
      `Maintain the Celestial Futurism style: covered in cosmic patterns, tiny stars, nebula swirls, soft neon glow accents in purple and blue. ` +
      `Sitting or floating pose, facing slightly forward, friendly and joyful expression. ` +
      `Background: pure deep black cosmic void, no frame, no oval, no background shape. ` +
      `Character floats freely in space. Painterly digital illustration, vibrant colors, high detail.`;

    const imageResponse = await client.images.edit({
      model: 'gpt-image-1',
      image: baseImage,
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'low',
    });

    const b64 = imageResponse.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data returned from GPT-image-1');

    await uploadPrivateWithRetry(b64, publicId);
    const moderationUrl = signedUrl(publicId);
    const safe = await isImageSafe(moderationUrl);

    if (!safe) {
      await cloudinary.uploader.destroy(publicId, { type: 'authenticated' }).catch(() => {});
      console.warn(`[avatar/personalise] Content flagged for student ${student_id}`);
      return NextResponse.json({ success: false, student_id, fallback: true, reason: 'content_flagged' });
    }

    await saveAvatarPublicId(student_id, publicId);
    return NextResponse.json({
      success: true,
      student_id,
      avatar_url: signedUrl(publicId),
    });
  } catch (err) {
    console.error('[avatar/personalise] Generation failed:', err);
    return NextResponse.json({ success: false, student_id, fallback: true, reason: 'generation_failed' });
  }
}
