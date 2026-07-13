import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession     = vi.fn();
const refreshSession = vi.fn().mockResolvedValue({ data: {}, error: null });

vi.mock('@/lib/supabase', () => ({
  getBrowserClient: () => ({ auth: { getSession, refreshSession } }),
}));

function sessionWithMetadata(metadata: Record<string, unknown> | null) {
  return {
    data: {
      session: metadata === null ? null : { user: { user_metadata: metadata } },
    },
  };
}

describe('getSessionStudentId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns student_id from session metadata without calling the server', async () => {
    getSession.mockResolvedValue(sessionWithMetadata({ student_id: 'student-1' }));
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { getSessionStudentId } = await import('@/lib/session');

    expect(await getSessionStudentId()).toBe('student-1');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null without calling the server when there is no session', async () => {
    getSession.mockResolvedValue(sessionWithMetadata(null));
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const { getSessionStudentId } = await import('@/lib/session');

    expect(await getSessionStudentId()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to /api/student/me when metadata lacks student_id, then refreshes the session', async () => {
    getSession.mockResolvedValue(sessionWithMetadata({ role: 'student' }));
    const fetchSpy = vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => ({ studentId: 'student-1' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const { getSessionStudentId } = await import('@/lib/session');

    expect(await getSessionStudentId()).toBe('student-1');
    expect(fetchSpy).toHaveBeenCalledWith('/api/student/me');
    expect(refreshSession).toHaveBeenCalled();
  });

  it('returns null when the identity endpoint rejects the session', async () => {
    getSession.mockResolvedValue(sessionWithMetadata({ role: 'teacher' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const { getSessionStudentId } = await import('@/lib/session');

    expect(await getSessionStudentId()).toBeNull();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('returns null when the identity endpoint is unreachable', async () => {
    getSession.mockResolvedValue(sessionWithMetadata({ role: 'student' }));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const { getSessionStudentId } = await import('@/lib/session');

    expect(await getSessionStudentId()).toBeNull();
  });
});
