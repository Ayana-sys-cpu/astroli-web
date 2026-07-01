// =============================================================================
// /api/teacher/journeys
//
// GET  — list all classes for the authenticated teacher, each with its
//         template's missions, that class's live state, and its active vote
//         session. The ?teacherId= query param is ignored — identity comes
//         from the verified session cookie.
// PATCH — vote session state machine:
//   voteEndsAt set, no open session → INSERT vote_session + locked→voting
//   voteEndsAt set, session exists  → UPDATE session ends_at
//   voteEndsAt null                 → conclude active session + voting→locked
//
// NOTE: `journeyId` in the wire format (query/body field names, response
// `journey.id`) is kept for frontend backward compatibility, but the value
// is a classes.id — see docs/architecture/2026-06-16-journeys-classes-redesign.md.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { translateMission } from '@/lib/translate-mission';

// ---------------------------------------------------------------------------
// GET /api/teacher/journeys
// teacherId is taken from the session — the ?teacherId= query param is ignored.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  const { data: classes, error } = await supabaseAdmin
    .from('classes')
    .select('id, title, language, google_course_id, journey_id')
    .eq('teacher_id', teacherId)
    .order('created_at');

  if (error) {
    console.error('[GET /api/teacher/journeys]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!classes || classes.length === 0) {
    return NextResponse.json({ journeys: [] });
  }

  const classIds  = classes.map(c => c.id);
  const journeyIds = classes.map(c => c.journey_id);

  const [{ data: missionRows, error: mErr }, { data: stateRows }, { data: sessionRows }] = await Promise.all([
    supabaseAdmin
      .from('missions')
      .select('id, journey_id, question, project_title, "order"')
      .in('journey_id', journeyIds)
      .order('"order"'),
    supabaseAdmin
      .from('class_mission_state')
      .select('class_id, mission_id, state')
      .in('class_id', classIds),
    supabaseAdmin
      .from('vote_sessions')
      .select('id, class_id, starts_at, ends_at, status, winner_id')
      .in('class_id', classIds),
  ]);

  if (mErr) {
    console.error('[GET /api/teacher/journeys]', mErr);
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  const missionsByJourney = new Map<string, typeof missionRows>();
  for (const m of missionRows ?? []) {
    const list = missionsByJourney.get(m.journey_id) ?? [];
    list.push(m);
    missionsByJourney.set(m.journey_id, list);
  }
  const stateByClassAndMission = new Map((stateRows ?? []).map(r => [`${r.class_id}:${r.mission_id}`, r.state]));
  const sessionsByClass = new Map<string, typeof sessionRows>();
  for (const s of sessionRows ?? []) {
    const list = sessionsByClass.get(s.class_id!) ?? [];
    list.push(s);
    sessionsByClass.set(s.class_id!, list);
  }

  const journeys = classes.map(c => {
    const sessions = sessionsByClass.get(c.id) ?? [];
    const activeSession = (sessions as any[]).find(s => s.status === 'open') ?? null;

    return {
      id:             c.id,
      title:          c.title,
      language:       (c as any).language ?? 'en',
      googleCourseId: c.google_course_id,
      activeVoteSession: activeSession
        ? { id: activeSession.id, startsAt: activeSession.starts_at, endsAt: activeSession.ends_at }
        : null,
      missions: (missionsByJourney.get(c.journey_id) ?? []).map(m => ({
        id:           m.id,
        question:     m.question,
        projectTitle: m.project_title,
        state:        stateByClassAndMission.get(`${c.id}:${m.id}`) ?? 'locked',
        order:        m.order,
      })),
    };
  });

  return NextResponse.json({ journeys });
}

// ---------------------------------------------------------------------------
// PATCH /api/teacher/journeys
// Body: { journeyId: string; voteEndsAt: string | null }
//
// voteEndsAt set:
//   - If an open session already exists → update its ends_at
//   - Otherwise → create a new session and transition locked→voting
// voteEndsAt null:
//   - Conclude the active session (status → 'concluded')
//   - Revert voting→locked (caller may then PATCH individual missions to
//     pending_start/skipped via /api/teacher/missions)
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  let body: { journeyId?: string; voteEndsAt?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { journeyId: classId, voteEndsAt, voteStartsAt, language } = body as { journeyId?: string; voteEndsAt?: string | null; voteStartsAt?: string | null; language?: string };
  if (!classId) {
    return NextResponse.json({ error: 'journeyId required' }, { status: 400 });
  }

  // Verify the class belongs to this teacher, and resolve its template.
  const { data: klass } = await supabaseAdmin
    .from('classes')
    .select('id, journey_id')
    .eq('id', classId)
    .eq('teacher_id', teacherId)
    .maybeSingle();

  if (!klass) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Language update ────────────────────────────────────────────────────────
  if (language !== undefined) {
    if (!['en', 'he'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }
    const { error: langErr } = await supabaseAdmin
      .from('classes')
      .update({ language })
      .eq('id', classId);

    if (langErr) {
      console.error('[PATCH /api/teacher/journeys language]', langErr);
      return NextResponse.json({ error: langErr.message }, { status: 500 });
    }

    // Fan out translations for all missions in the template (fire-and-forget).
    if (language === 'he') {
      supabaseAdmin
        .from('missions')
        .select('id')
        .eq('journey_id', klass.journey_id)
        .then(({ data: missions }) => {
          for (const m of missions ?? []) {
            translateMission(m.id).catch(err =>
              console.error('[translate-mission background]', m.id, err),
            );
          }
        });
    }

    return NextResponse.json({ ok: true, language });
  }

  const parsedEndsAt   = voteEndsAt   ? new Date(voteEndsAt).toISOString()   : null;
  const parsedStartsAt = voteStartsAt ? new Date(voteStartsAt).toISOString() : null;

  if (parsedEndsAt) {
    // ── Opening or extending a vote ────────────────────────────────────────

    // Check if there's already an open session for this class.
    const { data: existing } = await supabaseAdmin
      .from('vote_sessions')
      .select('id')
      .eq('class_id', classId)
      .eq('status', 'open')
      .maybeSingle();

    let sessionId: string;

    if (existing) {
      // Update the end time of the existing session.
      const { data: updated, error } = await supabaseAdmin
        .from('vote_sessions')
        .update({ ends_at: parsedEndsAt })
        .eq('id', existing.id)
        .select('id, ends_at')
        .single();

      if (error) {
        console.error('[PATCH /api/teacher/journeys] update session', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      sessionId = updated.id;
    } else {
      // Create a new session. vote_sessions.journey_id was dropped by the
      // classes-split cleanup migration — class_id is the only FK now.
      const { data: created, error: sessionError } = await supabaseAdmin
        .from('vote_sessions')
        .insert({ class_id: classId, starts_at: parsedStartsAt, ends_at: parsedEndsAt, status: 'open' })
        .select('id, ends_at, starts_at')
        .single();

      if (sessionError) {
        console.error('[PATCH /api/teacher/journeys] create session', sessionError);
        return NextResponse.json({ error: sessionError.message }, { status: 500 });
      }
      sessionId = created.id;

      // Transition this class's locked missions to 'voting' so students are
      // routed to /vote in real time. State lives in class_mission_state now,
      // not on the (shared, template-owned) missions row.
      const { error: stateError } = await supabaseAdmin
        .from('class_mission_state')
        .update({ state: 'voting' })
        .eq('class_id', classId)
        .eq('state', 'locked');

      if (stateError) {
        console.error('[PATCH /api/teacher/journeys] mission → voting', stateError);
        return NextResponse.json({ error: stateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      journey: { id: classId },
      sessionId,
      sessionEndsAt:   parsedEndsAt,
      sessionStartsAt: parsedStartsAt,
    });

  } else {
    // ── Concluding a vote ──────────────────────────────────────────────────

    const { error: sessionError } = await supabaseAdmin
      .from('vote_sessions')
      .update({ status: 'concluded' })
      .eq('class_id', classId)
      .eq('status', 'open');

    if (sessionError) {
      console.error('[PATCH /api/teacher/journeys] conclude session', sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Revert voting missions to locked for this class. The caller
    // (handleFinishVote) will then PATCH individual missions to
    // pending_start / skipped as needed.
    const { error: stateError } = await supabaseAdmin
      .from('class_mission_state')
      .update({ state: 'locked' })
      .eq('class_id', classId)
      .eq('state', 'voting');

    if (stateError) {
      console.error('[PATCH /api/teacher/journeys] mission → locked', stateError);
      return NextResponse.json({ error: stateError.message }, { status: 500 });
    }

    return NextResponse.json({ journey: { id: classId } });
  }
}
