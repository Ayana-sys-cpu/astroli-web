// =============================================================================
// /api/teacher/missions
//
// GET  ?id=<missionId>     — single mission with its planets (curriculum preview —
//                            no class context, so no per-class state is returned)
// GET  ?journeyId=<classId> — all missions for a class, with that class's live state
// PATCH { journeyId, missionId, state } — update a mission's state FOR THAT CLASS
//
// NOTE on naming: `journeyId` here is a wire-format field name kept for
// frontend backward compatibility — see docs/architecture/2026-06-16-journeys-classes-redesign.md.
// The value is a classes.id, not a journeys.id. Missions/planets are owned
// exclusively by template journeys now (never duplicated per class), so a
// mission's live "locked/active/completed" state lives in class_mission_state,
// keyed by (class_id, mission_id) — which is why PATCH now needs journeyId
// (the class) in addition to missionId: one mission can serve many classes.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, assertTeacherSession } from '@/lib/auth';
import { translateMission } from '@/lib/translate-mission';

function toMission(m: any, state: string | null, lang: 'en' | 'he' = 'en') {
  const he = lang === 'he' ? ((m.translations as any)?.he ?? {}) : {};
  return {
    id:                  m.id,
    journeyId:           m.journey_id,
    question:            he.question            ?? m.question,
    questionDescription: he.question_description ?? m.question_description,
    projectTitle:        he.project_title        ?? m.project_title,
    projectDescription:  he.project_description  ?? m.project_description,
    openingMessage:      m.opening_message,
    language:            lang,
    state,
    order:               m.order,
    planets:             (m.planets ?? []).map((p: any) => {
      const phe = lang === 'he' ? ((p.translations as any)?.he ?? {}) : {};
      return {
        id:             p.id,
        title:          phe.title   ?? p.title,
        content:        phe.content ?? p.content,
        openingMessage: p.opening_message,
        mediaUrl:       p.media_url,
        mediaType:      p.media_type,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// GET /api/teacher/missions?journeyId=   — list all missions for a class
// GET /api/teacher/missions?id=          — single mission with its planets (preview)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;
  const missionId = req.nextUrl.searchParams.get('id');

  // ── Single mission lookup (curriculum preview, no class context) ─────────
  if (missionId) {
    // Missions are public curriculum content now — they're never owned by a
    // teacher, only by a template journey, so there's no per-mission
    // ownership check left to make here.
    const { data, error } = await supabaseAdmin
      .from('missions')
      .select('*, planets(*)')
      .eq('id', missionId)
      .order('created_at', { referencedTable: 'planets' })
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ mission: toMission(data, null) });
  }

  // ── Mission list for a class ──────────────────────────────────────────────
  const journeyId = req.nextUrl.searchParams.get('journeyId'); // a classes.id
  if (!journeyId) {
    return NextResponse.json({ error: 'journeyId or id required' }, { status: 400 });
  }

  // Verify ownership and resolve the class's template in one query.
  const { data: klass } = await supabaseAdmin
    .from('classes')
    .select('id, journey_id, teacher_id, language')
    .eq('id', journeyId)
    .maybeSingle();

  if (!klass) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (klass.teacher_id !== teacherId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const lang: 'en' | 'he' = ((klass as any).language === 'he') ? 'he' : 'en';

  const [{ data: missions, error }, { data: stateRows }] = await Promise.all([
    supabaseAdmin
      .from('missions')
      .select('*, planets(*)')
      .eq('journey_id', klass.journey_id)
      .order('order'),
    supabaseAdmin
      .from('class_mission_state')
      .select('mission_id, state')
      .eq('class_id', klass.id),
  ]);

  if (error) {
    console.error('[GET /api/teacher/missions]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stateByMissionId = new Map((stateRows ?? []).map(r => [r.mission_id, r.state]));

  return NextResponse.json({
    missions: (missions ?? []).map(m => toMission(m, stateByMissionId.get(m.id) ?? 'locked', lang)),
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/teacher/missions
// Body: { journeyId: string (a classes.id); missionId: string; state: MissionState }
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const sessionError = assertTeacherSession(auth.user);
  if (sessionError) return sessionError;

  const teacherId = auth.user.user_metadata.teacher_id as string;

  let body: { journeyId?: string; missionId?: string; state?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { journeyId: classId, missionId, state, language } = body;

  // Language-only update — no class context needed
  if (missionId && language && !state) {
    if (!['en', 'he'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from('missions')
      .update({ language })
      .eq('id', missionId);
    if (error) {
      console.error('[PATCH /api/teacher/missions language]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // When switching to Hebrew, kick off translation in the background if not
    // already translated. We don't await — teacher gets instant feedback and
    // translation completes before any student opens the mission.
    if (language === 'he') {
      const { data: existing } = await supabaseAdmin
        .from('missions')
        .select('translations')
        .eq('id', missionId)
        .single();

      const hasHeTranslation =
        existing?.translations &&
        typeof existing.translations === 'object' &&
        'he' in (existing.translations as object);

      if (!hasHeTranslation) {
        translateMission(missionId).catch((err) =>
          console.error('[translate-mission background]', missionId, err),
        );
      }
    }

    return NextResponse.json({ ok: true, language });
  }

  if (!classId || !missionId || !state) {
    return NextResponse.json({ error: 'journeyId, missionId, and state required' }, { status: 400 });
  }

  // Verify the teacher owns this class, and resolve its template.
  const { data: klass } = await supabaseAdmin
    .from('classes')
    .select('id, journey_id, teacher_id')
    .eq('id', classId)
    .maybeSingle();

  if (!klass) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (klass.teacher_id !== teacherId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify the mission actually belongs to this class's template — prevents
  // a teacher from writing class_mission_state for an unrelated mission.
  const { data: mission } = await supabaseAdmin
    .from('missions')
    .select('id, journey_id')
    .eq('id', missionId)
    .maybeSingle();

  if (!mission || mission.journey_id !== klass.journey_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('class_mission_state')
    .upsert(
      { class_id: classId, mission_id: missionId, state },
      { onConflict: 'class_id,mission_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('[PATCH /api/teacher/missions]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mission: { ...mission, state: data.state } });
}
