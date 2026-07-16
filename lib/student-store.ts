/**
 * Thin, type-safe localStorage helpers for the student UI session.
 *
 * SCOPE: display-layer state only (name, avatar URL, onboarding flags,
 * interest, alien name, journey/mission hints). Nothing here is used
 * for authentication or authorization — identity comes from the
 * server-validated Supabase session (see lib/session.ts).
 *
 * Sensitive fields (studentId, email) are intentionally absent.
 * Reading those on the client: use getSessionStudentId() from lib/session.ts.
 */

import { toDisplayFirstName } from './display-name';
import { GUIDE_NAME } from './guide';

const K = {
  FIRST_NAME:       'astroli_first_name',
  BASE_AVATAR:      'astroli_base_avatar_url',
  AVATAR_URL:       'astroli_avatar_url',
  ONBOARDING:       'astroli_onboarding_complete',
  INTEREST:         'astroli_interest',
  JOURNEY_ACTIVE:   'astroli_journey_active',
  MISSION_REVEALED: 'astroli_mission_revealed_id',
} as const;

function ls(): Storage | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

// ── Write ────────────────────────────────────────────────────────────────────

/** Display-layer data stored on login. studentId and email are omitted — use lib/session.ts. */
export interface StudentRecord {
  firstName:     string;
  baseAvatarUrl: string | null;
  avatarUrl?:    string | null;
}

export function saveStudent(r: StudentRecord): void {
  const s = ls(); if (!s) return;
  s.setItem(K.FIRST_NAME, r.firstName);
  if (r.baseAvatarUrl) s.setItem(K.BASE_AVATAR, r.baseAvatarUrl);
  if (r.avatarUrl)     s.setItem(K.AVATAR_URL, r.avatarUrl);
}

// ── Read ─────────────────────────────────────────────────────────────────────

export function loadStudent(): StudentRecord | null {
  const s = ls(); if (!s) return null;
  const firstName = s.getItem(K.FIRST_NAME);
  if (!firstName) return null;
  return {
    firstName,
    baseAvatarUrl: s.getItem(K.BASE_AVATAR),
    avatarUrl:     s.getItem(K.AVATAR_URL),
  };
}

/** Returns the effective avatar URL — custom avatar if set, otherwise base avatar. */
export function getEffectiveAvatarUrl(): string | null {
  return ls()?.getItem(K.AVATAR_URL) ?? ls()?.getItem(K.BASE_AVATAR) ?? null;
}

export function getFirstName(): string {
  // Sanitized on read: accounts created before invite names existed stored the
  // raw email prefix (e.g. "ayana.student.test") as their first name.
  return toDisplayFirstName(ls()?.getItem(K.FIRST_NAME) ?? 'Traveler');
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
  // Also clear any legacy keys that may have been set by older versions.
  ['astroli_email', 'astroli_student_id'].forEach(k => s.removeItem(k));
}

// ── Bot identity ─────────────────────────────────────────────────────────────

/** The guide's name. Always "Orin" — never per-student, never "Scout". */
export function getBotName(): string {
  return GUIDE_NAME;
}
