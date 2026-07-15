import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory supabase fake (same shape as __tests__/api/parent-family-class) ─

type TableState = {
  rows: any[];
  inserted: any[];
  insertError: { code: string; message: string } | null;
  deletedIds: string[];
};

const tables: Record<string, TableState> = {};

function tableState(name: string): TableState {
  if (!tables[name]) {
    tables[name] = { rows: [], inserted: [], insertError: null, deletedIds: [] };
  }
  return tables[name];
}

function makeBuilder(name: string) {
  const state = tableState(name);
  const filters: Array<[string, any]> = [];
  const notNullColumns: string[] = [];
  let deleting = false;

  const matching = () =>
    state.rows.filter(row =>
      filters.every(([col, val]) =>
        Array.isArray(val) ? val.includes(row[col]) : row[col] === val,
      ) && notNullColumns.every(col => row[col] != null),
    );

  const builder: any = {
    select: () => builder,
    eq: (col: string, val: any) => { filters.push([col, val]); return builder; },
    in: (col: string, vals: any[]) => { filters.push([col, vals]); return builder; },
    not: (col: string, op: string, val: any) => {
      if (op === 'is' && val === null) notNullColumns.push(col);
      return builder;
    },
    maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
    insert: (payload: any) => {
      if (state.insertError) {
        return Promise.resolve({ data: null, error: state.insertError });
      }
      const rows = (Array.isArray(payload) ? payload : [payload]).map((row: any, i: number) => ({
        id: `${name}-new-${state.inserted.length + i + 1}`,
        ...row,
      }));
      state.inserted.push(...rows);
      state.rows.push(...rows);
      return Promise.resolve({ data: rows, error: null });
    },
    delete: () => { deleting = true; return builder; },
    then: (onFulfilled: any, onRejected: any) => {
      if (deleting) {
        const matched = matching();
        state.deletedIds.push(...matched.map(r => r.id));
        state.rows = state.rows.filter(r => !matched.includes(r));
        return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
      }
      return Promise.resolve({ data: matching(), error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: (name: string) => makeBuilder(name) },
}));

function mockGoogleClassroomCourses(courseIds: string[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok:   true,
    json: async () => ({ courses: courseIds.map(id => ({ id })) }),
  }));
}

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  vi.unstubAllGlobals();
});

describe('enrollStudentInJourneys stale-enrollment cleanup', () => {
  it('never removes enrollments in classes without a google_course_id (family / manual classes)', async () => {
    // Student is in one GC course; also enrolled in a family class on another template.
    mockGoogleClassroomCourses(['858023716985']);
    tableState('classes').rows.push(
      { id: 'school-class-1', journey_id: 'template-1', google_course_id: '858023716985' },
      { id: 'family-class-1', journey_id: 'template-2', google_course_id: null, type: 'family' },
    );
    tableState('student_classes').rows.push(
      { id: 'sc-family', student_id: 'student-1', class_id: 'family-class-1', template_journey_id: 'template-2' },
    );

    const { enrollStudentInJourneys } = await import('@/lib/enroll-student');
    await enrollStudentInJourneys('student-1', 'gc-access-token');

    const enrollments = tableState('student_classes');
    // Family enrollment survives the sync…
    expect(enrollments.deletedIds).toEqual([]);
    // …and the GC-matched school class was still enrolled.
    expect(enrollments.inserted).toEqual([
      expect.objectContaining({ student_id: 'student-1', class_id: 'school-class-1' }),
    ]);
  });

  it('still removes stale enrollments in GC-linked classes the student left', async () => {
    mockGoogleClassroomCourses(['858023716985']);
    tableState('classes').rows.push(
      { id: 'school-class-1', journey_id: 'template-1', google_course_id: '858023716985' },
      { id: 'old-school-class', journey_id: 'template-3', google_course_id: '111222333444' },
    );
    tableState('student_classes').rows.push(
      { id: 'sc-old', student_id: 'student-1', class_id: 'old-school-class', template_journey_id: 'template-3' },
    );

    const { enrollStudentInJourneys } = await import('@/lib/enroll-student');
    await enrollStudentInJourneys('student-1', 'gc-access-token');

    expect(tableState('student_classes').deletedIds).toEqual(['sc-old']);
  });
});
