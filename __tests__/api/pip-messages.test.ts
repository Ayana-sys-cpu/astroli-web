import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const insertMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  resolveStudentIdFromRequest: vi.fn().mockResolvedValue('student-1'),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: () => ({ insert: insertMock }) },
}));

function postPipMessages(body: unknown) {
  return import('@/app/api/student/pip-messages/route').then(({ POST }) =>
    POST(new NextRequest('http://localhost/api/student/pip-messages', {
      method: 'POST',
      body: JSON.stringify(body),
    })),
  );
}

describe('POST /api/student/pip-messages', () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue({ error: null });
  });

  it('saves messages with string content', async () => {
    const res = await postPipMessages({
      missionId: 'm1',
      messages: [{ role: 'pip', content: 'Hello!', triggerType: 'qa' }],
    });
    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith([
      { student_id: 'student-1', mission_id: 'm1', role: 'pip', content: 'Hello!', trigger_type: 'qa' },
    ]);
  });

  it('rejects a message whose content is missing with 400, not 500 (prod bug: undefined qa reply)', async () => {
    const res = await postPipMessages({
      missionId: 'm1',
      messages: [{ role: 'pip', triggerType: 'qa' }],
    });
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects empty-string content with 400', async () => {
    const res = await postPipMessages({
      missionId: 'm1',
      messages: [{ role: 'pip', content: '', triggerType: 'qa' }],
    });
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
