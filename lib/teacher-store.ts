/**
 * Thin, type-safe localStorage helpers for the teacher UI session.
 *
 * SCOPE: display-layer state only (name, role hint, course cache).
 * Nothing here is used for authentication — identity comes from the
 * server-validated Supabase session (see lib/session.ts).
 *
 * Sensitive fields (teacherId, email, googleId) are intentionally absent.
 * Reading the teacher ID on the client: use getSessionTeacherId() from
 * lib/session.ts.
 */

const K = {
  NAME:    'astroli_teacher_name',
  ROLE:    'astroli_teacher_role',   // display hint only — server is the real gate
  COURSES: 'astroli_teacher_courses',
} as const;

function ls(): Storage | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

export interface CourseRecord {
  id:      string;
  name:    string;
  section: string | null;
}

/** Display-layer data stored on login. teacherId/email/googleId are omitted — use lib/session.ts. */
export interface TeacherRecord {
  name: string;
}

export function saveTeacher(r: TeacherRecord): void {
  const s = ls(); if (!s) return;
  s.setItem(K.NAME, r.name);
  s.setItem(K.ROLE, 'teacher');
}

export function loadTeacher(): TeacherRecord | null {
  const s = ls(); if (!s) return null;
  const name = s.getItem(K.NAME);
  if (!name) return null;
  return { name };
}

export function getTeacherName(): string {
  return ls()?.getItem(K.NAME) ?? 'Teacher';
}

export function isTeacherSession(): boolean {
  return ls()?.getItem(K.ROLE) === 'teacher';
}

export function saveCourses(courses: CourseRecord[]): void {
  ls()?.setItem(K.COURSES, JSON.stringify(courses));
}

export function getCourses(): CourseRecord[] {
  try { return JSON.parse(ls()?.getItem(K.COURSES) ?? '[]'); }
  catch { return []; }
}

export function clearTeacherSession(): void {
  const s = ls(); if (!s) return;
  Object.values(K).forEach((k) => s.removeItem(k));
  // Also clear any legacy keys set by older versions.
  ['astroli_teacher_id', 'astroli_teacher_email', 'astroli_teacher_google_id'].forEach(k => s.removeItem(k));
  // Clear dynamic vote keys.
  const toRemove: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (key && (key.startsWith('voteEnd_') || key.startsWith('voteSessionId_'))) {
      toRemove.push(key);
    }
  }
  toRemove.forEach(k => s.removeItem(k));
}
