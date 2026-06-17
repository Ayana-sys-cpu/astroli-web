// src/astroli-web/__tests__/api/students.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    ok: true,
    user: { user_metadata: { teacher_id: 'teacher-1', role: 'teacher' } },
  }),
  assertTeacherSession: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    journey: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'journey-1', title: '3A English – Rome Unit' },
      ]),
    },
    classSession: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/signals', () => ({
  generateSignals: vi.fn().mockResolvedValue([
    { studentId: 'student-1', signalType: 'breakthrough', signalCreatedAt: new Date() },
  ]),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [{ student_id: 'student-1', journey_id: 'journey-1' }],
        }),
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [] }),
        }),
        order: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ student_id: 'student-1', created_at: new Date().toISOString() }],
          }),
        }),
      }),
    }),
  },
}));

describe('GET /api/teacher/students', () => {
  it('returns students array and journeys array', async () => {
    const { GET } = await import('@/app/api/teacher/students/route');
    const req = new NextRequest('http://localhost/api/teacher/students');
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('students');
    expect(body).toHaveProperty('journeys');
    expect(Array.isArray(body.students)).toBe(true);
    expect(Array.isArray(body.journeys)).toBe(true);
  });

  it('each student has required fields', async () => {
    const { GET } = await import('@/app/api/teacher/students/route');
    const req = new NextRequest('http://localhost/api/teacher/students');
    const res = await GET(req as any);
    const body = await res.json();

    if (body.students.length > 0) {
      const student = body.students[0];
      expect(student).toHaveProperty('studentId');
      expect(student).toHaveProperty('name');
      expect(student).toHaveProperty('initials');
      expect(student).toHaveProperty('lastSeenAt');
      expect(student).toHaveProperty('isActiveNow');
      expect(student).toHaveProperty('signalType');
      expect(student).toHaveProperty('journeyEnrollments');
      expect(student).not.toHaveProperty('isFlagged');
    }
  });
});
