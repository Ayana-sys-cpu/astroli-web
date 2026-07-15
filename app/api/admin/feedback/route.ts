// GET  /api/admin/feedback?status=&studentId=&q=
// POST /api/admin/feedback
//
// Founder feedback log (spec: specs/founder/web-app/pilot-review-dashboard).
// Founder-only (ADMIN_EMAIL). Contract: contracts/admin-api.md.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';
import { parseBody } from '@/lib/validate';
import {
  CreateFeedbackBody,
  FEEDBACK_STATUSES,
  toFeedbackEntry,
  type FeedbackRow,
  type FeedbackStatus,
} from '@/lib/founder-feedback';

type StudentNameRow = {
  id:         string;
  full_name:  string | null;
  first_name: string | null;
  name:       string | null;
  alien_name: string | null;
};

function studentDisplayName(row: StudentNameRow | undefined): string | null {
  if (!row) return null;
  return row.full_name ?? row.first_name ?? row.name ?? row.alien_name ?? null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get('status');
  const studentId = req.nextUrl.searchParams.get('studentId');
  const q = req.nextUrl.searchParams.get('q');

  let query = supabaseAdmin
    .from('founder_feedback')
    .select('*')
    .order('created_at', { ascending: false });
  if (status && (FEEDBACK_STATUSES as readonly string[]).includes(status)) {
    query = query.eq('status', status as FeedbackStatus);
  }
  if (studentId) query = query.eq('student_id', studentId);
  if (q) query = query.ilike('content', `%${q}%`);

  const { data: rows, error } = await query;
  if (error) {
    console.error('[admin/feedback] list failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const feedbackRows = (rows ?? []) as FeedbackRow[];
  const taggedStudentIds = Array.from(
    new Set(feedbackRows.map((row) => row.student_id).filter((id): id is string => Boolean(id))),
  );

  const nameByStudentId = new Map<string, string | null>();
  if (taggedStudentIds.length > 0) {
    const { data: students } = await supabaseAdmin
      .from('users')
      .select('id, full_name, first_name, name, alien_name')
      .in('id', taggedStudentIds);
    for (const student of (students ?? []) as StudentNameRow[]) {
      nameByStudentId.set(student.id, studentDisplayName(student));
    }
  }

  return NextResponse.json({
    feedback: feedbackRows.map((row) =>
      toFeedbackEntry(row, row.student_id ? nameByStudentId.get(row.student_id) ?? null : null),
    ),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(req, CreateFeedbackBody);
  if (!parsed.ok) return parsed.response;
  const { studentId, source, content, tags } = parsed.data;

  const { data: row, error } = await supabaseAdmin
    .from('founder_feedback')
    .insert({ student_id: studentId ?? null, source, content, tags })
    .select()
    .single();

  if (error) {
    console.error('[admin/feedback] create failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const feedbackRow = row as FeedbackRow;
  let studentName: string | null = null;
  if (feedbackRow.student_id) {
    const { data: student } = await supabaseAdmin
      .from('users')
      .select('id, full_name, first_name, name, alien_name')
      .eq('id', feedbackRow.student_id)
      .maybeSingle();
    studentName = studentDisplayName((student ?? undefined) as StudentNameRow | undefined);
  }

  return NextResponse.json({ feedback: toFeedbackEntry(feedbackRow, studentName) }, { status: 201 });
}
