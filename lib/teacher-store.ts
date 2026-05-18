/**
 * Thin, type-safe localStorage helpers for the teacher session.
 */

const K = {
  TEACHER_ID:  'astroli_teacher_id',
  EMAIL:       'astroli_teacher_email',
  NAME:        'astroli_teacher_name',
  ROLE:        'astroli_teacher_role',
  GOOGLE_ID:   'astroli_teacher_google_id',
  COURSES:     'astroli_teacher_courses',
} as const;

function ls(): Storage | null {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

export interface TeacherRecord {
  teacherId: string;
  email:     string;
  name:      string;
  googleId:  string;
}

export interface CourseRecord {
  id:      string;
  name:    string;
  section: string | null;
}

export function saveCourses(courses: CourseRecord[]): void {
  const s = ls(); if (!s) return;
  s.setItem(K.COURSES, JSON.stringify(courses));
}

export function getCourses(): CourseRecord[] {
  const s = ls(); if (!s) return [];
  try { return JSON.parse(s.getItem(K.COURSES) ?? '[]'); }
  catch { return []; }
}

export function saveTeacher(r: TeacherRecord): void {
  const s = ls(); if (!s) return;
  s.setItem(K.TEACHER_ID, r.teacherId);
  s.setItem(K.EMAIL,      r.email);
  s.setItem(K.NAME,       r.name);
  s.setItem(K.ROLE,       'teacher');
  s.setItem(K.GOOGLE_ID,  r.googleId);
}

export function loadTeacher(): TeacherRecord | null {
  const s = ls(); if (!s) return null;
  const teacherId = s.getItem(K.TEACHER_ID);
  const email     = s.getItem(K.EMAIL);
  const name      = s.getItem(K.NAME);
  const googleId  = s.getItem(K.GOOGLE_ID);
  if (!teacherId || !email || !name || !googleId) return null;
  return { teacherId, email, name, googleId };
}

export function getTeacherId(): string | null {
  return ls()?.getItem(K.TEACHER_ID) ?? null;
}

export function getTeacherName(): string {
  return ls()?.getItem(K.NAME) ?? 'Teacher';
}

export function isTeacherSession(): boolean {
  return ls()?.getItem(K.ROLE) === 'teacher';
}

export function clearTeacherSession(): void {
  const s = ls(); if (!s) return;
  Object.values(K).forEach((k) => s.removeItem(k));
}
