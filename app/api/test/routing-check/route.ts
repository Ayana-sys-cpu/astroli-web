/**
 * GET /api/test/routing-check?email={email}
 *
 * Test-only endpoint used by the shadow session runner to verify student
 * routing without requiring a browser session.
 *
 * Auth: Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
 * — rejects any other token to prevent public exposure.
 *
 * Returns: { destination, reason }
 *   destination — the screen this student would land on after login
 *   reason      — human-readable explanation (for routing.md field notes)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  // ── Auth guard: service role key only ──────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 });
  }

  // ── SM-R1: does a users row exist? ─────────────────────────────────────────
  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('role', 'student')
    .maybeSingle();

  if (userErr) {
    return NextResponse.json({ error: 'DB error', detail: userErr.message }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({
      destination: '/onboarding/reveal',
      reason: 'no users row — new student',
    });
  }

  const studentId = user.id;

  // ── Enrollment check ───────────────────────────────────────────────────────
  const { data: enrollments, error: enrollErr } = await supabaseAdmin
    .from('student_classes')
    .select('class_id')
    .eq('student_id', studentId);

  if (enrollErr) {
    return NextResponse.json({ error: 'DB error', detail: enrollErr.message }, { status: 503 });
  }

  const classIds = (enrollments ?? []).map((e: { class_id: string | null }) => e.class_id).filter((id): id is string => Boolean(id));

  if (classIds.length === 0) {
    return NextResponse.json({
      destination: '/pending-journey',
      reason: 'no enrollments',
    });
  }

  // Missions live on templates only — state lives in class_mission_state.
  // ── Active mission? ────────────────────────────────────────────────────────
  const { data: activeState, error: missionErr } = await supabaseAdmin
    .from('class_mission_state')
    .select('mission_id')
    .eq('state', 'active')
    .in('class_id', classIds)
    .limit(1)
    .maybeSingle();

  if (missionErr) {
    return NextResponse.json({ error: 'DB error', detail: missionErr.message }, { status: 503 });
  }

  if (activeState) {
    return NextResponse.json({
      destination: '/landscape',
      reason: 'active mission found',
    });
  }

  // ── Open vote? ─────────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { data: openVote, error: voteErr } = await supabaseAdmin
    .from('vote_sessions')
    .select('id')
    .eq('status', 'open')
    .gt('ends_at', now)
    .in('class_id', classIds)
    .limit(1)
    .maybeSingle();

  if (voteErr) {
    return NextResponse.json({ error: 'DB error', detail: voteErr.message }, { status: 503 });
  }

  if (openVote) {
    return NextResponse.json({
      destination: '/vote',
      reason: 'open vote session',
    });
  }

  // ── Vote concluded, mission pending_start? ─────────────────────────────────
  const { data: pendingState, error: pendingErr } = await supabaseAdmin
    .from('class_mission_state')
    .select('mission_id')
    .eq('state', 'pending_start')
    .in('class_id', classIds)
    .limit(1)
    .maybeSingle();

  if (pendingErr) {
    return NextResponse.json({ error: 'DB error', detail: pendingErr.message }, { status: 503 });
  }

  if (pendingState) {
    return NextResponse.json({
      destination: '/vote',
      reason: 'pending_start — awaiting teacher activation',
    });
  }

  // ── Enrolled but nothing active ────────────────────────────────────────────
  return NextResponse.json({
    destination: '/pending-journey',
    reason: 'enrolled but no active mission or vote',
  });
}
