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
    .select('user_id, base_avatar_url')
    .eq('email', email.toLowerCase())
    .eq('role', 'student')
    .maybeSingle();

  if (userErr) {
    return NextResponse.json({ error: 'DB error', detail: userErr.message }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({
      destination: '/onboarding/interest',
      reason: 'no users row — new student',
    });
  }

  const studentId = user.user_id;

  // ── Enrollment check ───────────────────────────────────────────────────────
  const { data: enrollments, error: enrollErr } = await supabaseAdmin
    .from('student_journeys')
    .select('journey_id')
    .eq('student_id', studentId);

  if (enrollErr) {
    return NextResponse.json({ error: 'DB error', detail: enrollErr.message }, { status: 503 });
  }

  const journeyIds = (enrollments ?? []).map((e: { journey_id: string }) => e.journey_id);

  if (journeyIds.length === 0) {
    return NextResponse.json({
      destination: '/pending-journey',
      reason: 'no enrollments',
    });
  }

  // ── Active mission? ────────────────────────────────────────────────────────
  const { data: activeMission, error: missionErr } = await supabaseAdmin
    .from('missions')
    .select('id')
    .eq('state', 'active')
    .in('journey_id', journeyIds)
    .limit(1)
    .maybeSingle();

  if (missionErr) {
    return NextResponse.json({ error: 'DB error', detail: missionErr.message }, { status: 503 });
  }

  if (activeMission) {
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
    .in('journey_id', journeyIds)
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
  const { data: pendingMission, error: pendingErr } = await supabaseAdmin
    .from('missions')
    .select('id')
    .eq('state', 'pending_start')
    .in('journey_id', journeyIds)
    .limit(1)
    .maybeSingle();

  if (pendingErr) {
    return NextResponse.json({ error: 'DB error', detail: pendingErr.message }, { status: 503 });
  }

  if (pendingMission) {
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
