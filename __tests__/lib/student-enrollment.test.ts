import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();
vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: (...args: any[]) => fromMock(...args) },
}));

import { resolveEnrolledClassIds } from '@/lib/student-enrollment';

describe('resolveEnrolledClassIds', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('returns existing enrollments when present', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'student_classes') {
        return { select: () => ({ eq: () => Promise.resolve({ data: [{ class_id: 'class-1' }, { class_id: 'class-2' }] }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await resolveEnrolledClassIds('student-1');
    expect(result).toEqual(['class-1', 'class-2']);
  });

  it('self-heals into a class with an open vote when there are zero enrollments', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'student_classes') {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [] }) }),
          insert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === 'vote_sessions') {
        return {
          select: () => ({
            eq: () => ({
              gt: () => ({
                not: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: { class_id: 'class-9' } }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'classes') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'class-9', journey_id: 'journey-9' } }) }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await resolveEnrolledClassIds('student-1');
    expect(result).toEqual(['class-9']);
  });

  it('returns an empty array when there are zero enrollments and no open vote to self-heal into', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'student_classes') {
        return { select: () => ({ eq: () => Promise.resolve({ data: [] }) }) };
      }
      if (table === 'vote_sessions') {
        return {
          select: () => ({
            eq: () => ({
              gt: () => ({
                not: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await resolveEnrolledClassIds('student-1');
    expect(result).toEqual([]);
  });

  it('recovers by re-reading when a concurrent request already enrolled the student (unique violation)', async () => {
    let studentClassesSelectCalls = 0;

    fromMock.mockImplementation((table: string) => {
      if (table === 'student_classes') {
        return {
          select: () => ({
            eq: () => {
              studentClassesSelectCalls += 1;
              // First call (initial check): no enrollment yet.
              // Second call (after the race is detected): the concurrent
              // request's insert is now visible.
              return Promise.resolve({
                data: studentClassesSelectCalls === 1 ? [] : [{ class_id: 'class-9' }],
              });
            },
          }),
          insert: () => Promise.resolve({ error: { code: '23505', message: 'duplicate key value' } }),
        };
      }
      if (table === 'vote_sessions') {
        return {
          select: () => ({
            eq: () => ({
              gt: () => ({
                not: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: { class_id: 'class-9' } }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'classes') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'class-9', journey_id: 'journey-9' } }) }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await resolveEnrolledClassIds('student-1');
    expect(result).toEqual(['class-9']);
  });
});
