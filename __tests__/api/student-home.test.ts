import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ ok: true, user: { user_metadata: { student_id: 'student-1', role: 'student' } } }),
  resolveStudentId: vi.fn().mockResolvedValue('student-1'),
}));

vi.mock('@/lib/student-enrollment', () => ({
  resolveEnrolledClassIds: vi.fn().mockResolvedValue(['class-1']),
}));

const TABLES: Record<string, any[]> = {
  classes:              [{ id: 'class-1', title: 'World History', journey_id: 'journey-1', teacher_id: 'teacher-1' }],
  users:                [{ id: 'teacher-1', name: 'Mr. Lee' }],
  missions:             [{ id: 'mission-1', journey_id: 'journey-1', question: 'Q', project_title: 'The Schism Mission', order: 1 }],
  class_mission_state:  [{ class_id: 'class-1', mission_id: 'mission-1', state: 'active' }],
  vote_sessions:        [],
  planets:              [{ id: 'planet-1', mission_id: 'mission-1' }, { id: 'planet-2', mission_id: 'mission-1' }],
  planet_summaries:     [{ planet_id: 'planet-1', status: 'completed' }],
};

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      const rows = TABLES[table] ?? [];
      const result = Promise.resolve({ data: rows });
      const builder: any = {
        select: () => builder,
        eq:     () => builder,
        in:     () => builder,
        order:  () => builder,
        then:   result.then.bind(result),
        catch:  result.catch.bind(result),
      };
      return builder;
    }),
  },
}));

describe('GET /api/student/home', () => {
  it('returns one journey per enrolled class with a live status and planet progress', async () => {
    const { GET } = await import('@/app/api/student/home/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.journeys).toHaveLength(1);
    expect(body.journeys[0]).toMatchObject({
      classId:         'class-1',
      className:       'World History',
      teacherName:     'Mr. Lee',
      status:           'live',
      activeMissionId: 'mission-1',
      missionTitle:    'The Schism Mission',
      planetsExplored: 1,
      planetsTotal:    2,
    });
  });

  it('returns an empty journeys array when the student has zero enrollments', async () => {
    const { resolveEnrolledClassIds } = await import('@/lib/student-enrollment');
    (resolveEnrolledClassIds as any).mockResolvedValueOnce([]);

    const { GET } = await import('@/app/api/student/home/route');
    const res = await GET();
    const body = await res.json();

    expect(body).toEqual({ journeys: [] });
  });
});
