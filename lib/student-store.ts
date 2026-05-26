/**
 * Thin, type-safe localStorage helpers for the student session.
 * All keys are colocated here so nothing is scattered across pages.
 */

const K = {
  EMAIL:              'astroli_email',
  STUDENT_ID:         'astroli_student_id',
  FIRST_NAME:         'astroli_first_name',
  BASE_AVATAR:        'astroli_base_avatar_url',
  ONBOARDING:         'astroli_onboarding_complete',
  INTEREST:           'astroli_interest',
  ALIEN_NAME:         'astroli_alien_name',
  JOURNEY_ACTIVE:     'astroli_journey_active',
  MISSION_REVEALED:   'astroli_mission_revealed_id',
} as const;

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

export function saveBaseAvatarUrl(url: string): void {
  ls()?.setItem(K.BASE_AVATAR, url);
}

export function getBaseAvatarUrl(): string | null {
  return ls()?.getItem(K.BASE_AVATAR) ?? null;
}

export function saveInterest(interest: string): void {
  ls()?.setItem(K.INTEREST, interest);
}

export function getInterest(): string {
  return ls()?.getItem(K.INTEREST) ?? '';
}

export function saveAlienName(name: string): void {
  ls()?.setItem(K.ALIEN_NAME, name);
}

export function getAlienName(): string | null {
  return ls()?.getItem(K.ALIEN_NAME) ?? null;
}

export function markOnboardingComplete(): void {
  ls()?.setItem(K.ONBOARDING, '1');
}

export function isOnboardingComplete(): boolean {
  return ls()?.getItem(K.ONBOARDING) === '1';
}

export function saveJourneyActive(active: boolean): void {
  ls()?.setItem(K.JOURNEY_ACTIVE, active ? '1' : '0');
}

export function isJourneyActive(): boolean {
  return ls()?.getItem(K.JOURNEY_ACTIVE) === '1';
}

export function getRevealedMissionId(): string | null {
  return ls()?.getItem(K.MISSION_REVEALED) ?? null;
}

export function markMissionRevealed(missionId: string): void {
  ls()?.setItem(K.MISSION_REVEALED, missionId);
}

export function clearSession(): void {
  const s = ls(); if (!s) return;
  Object.values(K).forEach((k) => s.removeItem(k));
}

// ── Bot identity ─────────────────────────────────────────────────────────────

// Deterministic algorithm shared with the mobile app (FloatingBot.tsx) and
// the onboarding reveal page. Same input → same name, every time.
export function generateAlienName(interest: string): string {
  const prefixes = ['Xylo', 'Kael', 'Zyr', 'Vor', 'Nexo', 'Ael', 'Crix', 'Thal', 'Grix', 'Oru'];
  const suffixes = ['-Vex', '-9', '-Flux', '-Prime', '-Zyx', '-Kael', '-Omni', '-Sol', '-Nix', '-Ren'];
  const seed = Array.from(interest).reduce((a, c) => a + c.charCodeAt(0), 0);
  return prefixes[seed % prefixes.length] + suffixes[(seed * 7) % suffixes.length];
}

/**
 * Returns the student's bot companion name.
 * Priority: Supabase-persisted name (saved at onboarding) → computed from interest → 'Pip'.
 * The Supabase value is cached in localStorage so this is always synchronous.
 */
export function getBotName(): string {
  const stored = getAlienName();
  if (stored) return stored;
  const interest = getInterest();
  return interest ? generateAlienName(interest) : 'Pip';
}
