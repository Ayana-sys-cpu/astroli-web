import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  resolveStudentIdFromRequest: vi.fn(),
}));

function makeRequest() {
  return new Request('http://localhost/api/student/me') as any;
}

describe('GET /api/student/me', () => {
  it('returns the resolved studentId for an authenticated student', async () => {
    const { resolveStudentIdFromRequest } = await import('@/lib/auth');
    (resolveStudentIdFromRequest as any).mockResolvedValueOnce('student-1');

    const { GET } = await import('@/app/api/student/me/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ studentId: 'student-1' });
  });

  it('returns 401 when no student identity can be resolved', async () => {
    const { resolveStudentIdFromRequest } = await import('@/lib/auth');
    (resolveStudentIdFromRequest as any).mockResolvedValueOnce(null);

    const { GET } = await import('@/app/api/student/me/route');
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });
});
