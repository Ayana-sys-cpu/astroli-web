import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const VALID_ACTIONS = new Set([
  'impression', 'dwell', 'like', 'comment',
  'learn_more', 'task_done', 'skip',
]);

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.edit_id || !body?.action) {
    return NextResponse.json({ error: 'edit_id and action are required' }, { status: 400 });
  }

  const { edit_id, action, value } = body as {
    edit_id: string;
    action: string;
    value?: number | null;
  };

  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${[...VALID_ACTIONS].join(', ')}` },
      { status: 400 },
    );
  }

  if (action === 'dwell' && (value === undefined || value === null || typeof value !== 'number')) {
    return NextResponse.json({ error: 'value (seconds) is required for dwell events' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('feed_events').insert({
    student_id: studentId,
    edit_id,
    action,
    value: action === 'dwell' ? value : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({}, { status: 201 });
}
