import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Cookie session state — mutated per test. null = no web session (mobile scenario).
let cookieUser: { id: string; user_metadata: Record<string, unknown> } | null = null;

const adminGetUser = vi.fn();

// requireAuth() reads the middleware-verified user header via next/headers;
// these tests exercise the no-header (mobile) path.
vi.mock('next/headers', () => ({
  headers: () => new Headers(),
}));

vi.mock('@/lib/supabase-server', () => ({
  createSSRServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: cookieUser }, error: cookieUser ? null : new Error('no session') }) },
  }),
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => adminGetUser(...args),
      admin: { updateUserById: vi.fn().mockResolvedValue({}) },
    },
    from: vi.fn(() => {
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.maybeSingle = async () => ({ data: null, error: null });
      return builder;
    }),
  },
}));

import { resolveStudentIdFromRequest } from '@/lib/auth';

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/student/planet-progress', { headers });
}

function studentTokenUser(studentId: string) {
  return { id: 'auth-user-1', user_metadata: { role: 'student', student_id: studentId } };
}

beforeEach(() => {
  cookieUser = null;
  adminGetUser.mockReset();
});

describe('resolveStudentIdFromRequest — mobile bearer auth', () => {
  it('rejects a bare x-student-id header with no bearer token (impersonation regression)', async () => {
    const result = await resolveStudentIdFromRequest(request({ 'x-student-id': 'victim-student-uuid' }));
    expect(result).toBeNull();
    expect(adminGetUser).not.toHaveBeenCalled();
  });

  it('resolves the student from a valid bearer token', async () => {
    adminGetUser.mockResolvedValue({ data: { user: studentTokenUser('student-1') }, error: null });
    const result = await resolveStudentIdFromRequest(request({ authorization: 'Bearer valid-jwt' }));
    expect(result).toBe('student-1');
    expect(adminGetUser).toHaveBeenCalledWith('valid-jwt');
  });

  it('rejects when x-student-id names a different student than the token subject', async () => {
    adminGetUser.mockResolvedValue({ data: { user: studentTokenUser('student-1') }, error: null });
    const result = await resolveStudentIdFromRequest(
      request({ authorization: 'Bearer valid-jwt', 'x-student-id': 'student-2' }),
    );
    expect(result).toBeNull();
  });

  it('accepts when x-student-id matches the token subject', async () => {
    adminGetUser.mockResolvedValue({ data: { user: studentTokenUser('student-1') }, error: null });
    const result = await resolveStudentIdFromRequest(
      request({ authorization: 'Bearer valid-jwt', 'x-student-id': 'student-1' }),
    );
    expect(result).toBe('student-1');
  });

  it('rejects an invalid bearer token even when x-student-id is a real student', async () => {
    adminGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid JWT') });
    const result = await resolveStudentIdFromRequest(
      request({ authorization: 'Bearer forged', 'x-student-id': 'student-1' }),
    );
    expect(result).toBeNull();
  });

  it('rejects a bearer token that belongs to a non-student (no student_id resolvable)', async () => {
    adminGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-2', email: 'teacher@x.com', user_metadata: { role: 'teacher', teacher_id: 't-1' } } },
      error: null,
    });
    const result = await resolveStudentIdFromRequest(request({ authorization: 'Bearer teacher-jwt' }));
    expect(result).toBeNull();
  });

  it('rejects requests with no credentials at all', async () => {
    expect(await resolveStudentIdFromRequest(request())).toBeNull();
  });

  it('still resolves web cookie sessions without any headers', async () => {
    cookieUser = { id: 'auth-user-3', user_metadata: { role: 'student', student_id: 'student-web' } };
    expect(await resolveStudentIdFromRequest(request())).toBe('student-web');
  });
});
