// POST /api/activity/ping
//
// Heartbeat from student clients (web layout + mobile app) that powers the
// founder's pilot-review activity view. Pings gapped under 30 minutes extend
// the student's current session row; a longer gap opens a new one, so
// "session" and "time spent" fall out of the row itself.
//
// Auth: middleware already rejects anonymous calls (401). Authenticated
// non-student sessions (teacher / parent / founder) get { tracked: false }
// so the client stops pinging.
//
// Body: { platform?: 'web' | 'mobile' } — defaults to 'web'.
// Stores who / when / platform only (COPPA-minimal): never log IP,
// user-agent, or device identifiers here.

import { NextRequest, NextResponse } from 'next/server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { z, parseBody } from '@/lib/validate';
import { SESSION_STITCH_GAP_MINUTES } from '@/lib/activity-sessions';

const PingBody = z.object({
  platform: z.enum(['web', 'mobile']).default('web'),
});

export async function POST(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) {
    return NextResponse.json({ tracked: false });
  }

  const parsed = await parseBody(req, PingBody);
  if (!parsed.ok) return parsed.response;
  const { platform } = parsed.data;

  // Sessions are stitched per platform: a web ping never extends a mobile
  // session, so simultaneous web + mobile use stays two clean rows instead
  // of ping-ponging new rows on every heartbeat.
  const { data: currentSession } = await supabaseAdmin
    .from('student_activity_sessions')
    .select('id, last_ping_at, ping_count')
    .eq('student_id', studentId)
    .eq('platform', platform)
    .eq('source', 'ping')
    .order('last_ping_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const stitchGapMs = SESSION_STITCH_GAP_MINUTES * 60_000;
  const withinStitchGap =
    currentSession &&
    Date.now() - new Date(currentSession.last_ping_at).getTime() < stitchGapMs;

  if (withinStitchGap) {
    const { error } = await supabaseAdmin
      .from('student_activity_sessions')
      .update({ last_ping_at: nowIso, ping_count: currentSession.ping_count + 1 })
      .eq('id', currentSession.id);
    if (error) {
      console.error('[activity/ping] session update failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin
      .from('student_activity_sessions')
      .insert({ student_id: studentId, platform, started_at: nowIso, last_ping_at: nowIso });
    if (error) {
      // 23503: the session's student_id points at no users row (stale session
      // outliving a deleted account). Not trackable — tell the client to stop.
      if (error.code === '23503') {
        return NextResponse.json({ tracked: false });
      }
      console.error('[activity/ping] session insert failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ tracked: true });
}
