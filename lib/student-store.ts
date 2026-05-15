/**
 * Thin, type-safe localStorage helpers for the student session.
 * All keys are colocated here so nothing is scattered across pages.
 */

const K = {
  EMAIL:        'astroli_email',
  STUDENT_ID:   'astroli_student_id',
  FIRST_NAME:   'astroli_first_name',
  BASE_AVATAR:  'astroli_base_avatar_url',
  AVATAR_URL:   'astroli_avatar_url',
  AVATAR_TS:    'astroli_avatar_fetched_at',
  ONBOARDING:   'astroli_onboarding_complete',
  INTEREST:     'astroli_interest',
} as const;

// Signed URLs last 1 hour; we re-fetch after 50 min to stay fresh.
const AVATAR_TTL_MS = 50 * 60 * 1000;

function ls(): Storage | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

// ── Write ────────────────────────────────────────────────────────────────────

export interface StudentRecord {
  studentId:    string;
  email:        string;
  firstName:    string;
  baseAvatarUrl: string | null;
}

export function saveStudent(r: StudentRecord): void {
  const s = ls(); if (!s) return;
  s.setItem(K.EMAIL,      r.email);
  s.setItem(K.STUDENT_ID, r.studentId);
  s.setItem(K.FIRST_NAME, r.firstName);
  if (r.baseAvatarUrl) s.setItem(K.BASE_AVATAR, r.baseAvatarUrl);
}

/** Cache a signed Cloudinary URL with a timestamp for TTL checks. */
export function cacheAvatarUrl(url: string): void {
  const s = ls(); if (!s) return;
  s.setItem(K.AVATAR_URL, url);
  s.setItem(K.AVATAR_TS,  String(Date.now()));
}

// ── Read ─────────────────────────────────────────────────────────────────────

export function loadStudent(): StudentRecord | null {
  const s = ls(); if (!s) return null;
  const studentId = s.getItem(K.STUDENT_ID);
  const email     = s.getItem(K.EMAIL);
  const firstName = s.getItem(K.FIRST_NAME);
  if (!studentId || !email || !firstName) return null;
  return { studentId, email, firstName, baseAvatarUrl: s.getItem(K.BASE_AVATAR) };
}

export function getStudentId(): string | null {
  return ls()?.getItem(K.STUDENT_ID) ?? null;
}

export function getFirstName(): string {
  return ls()?.getItem(K.FIRST_NAME) ?? 'Traveler';
}

/** Returns a cached signed URL if it is still within TTL, else null. */
export function getCachedAvatarUrl(): string | null {
  const s = ls(); if (!s) return null;
  const url = s.getItem(K.AVATAR_URL);
  const ts  = Number(s.getItem(K.AVATAR_TS) ?? 0);
  if (!url || Date.now() - ts > AVATAR_TTL_MS) return null;
  return url;
}

export function saveInterest(interest: string): void {
  ls()?.setItem(K.INTEREST, interest);
}

export function getInterest(): string {
  return ls()?.getItem(K.INTEREST) ?? '';
}

export function markOnboardingComplete(): void {
  ls()?.setItem(K.ONBOARDING, '1');
}

export function isOnboardingComplete(): boolean {
  return ls()?.getItem(K.ONBOARDING) === '1';
}

export function clearSession(): void {
  const s = ls(); if (!s) return;
  Object.values(K).forEach((k) => s.removeItem(k));
}
