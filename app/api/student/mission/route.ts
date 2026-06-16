import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAuth, resolveStudentId } from '@/lib/auth';

// GET /api/student/mission?missionId=<uuid>  — mission + all planets (for landscape hub)
// GET /api/student/mission?planetId=<uuid>   — single planet (for planet detail page)
//
// Mission and planet data are curriculum content accessible to any enrolled
// student — no per-student ownership check is needed beyond a valid session.
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const studentId = await resolveStudentId(auth.user);
  if (!studentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const missionId = req.nextUrl.searchParams.get('missionId');
  const planetId  = req.nextUrl.searchParams.get('planetId');

  if (missionId) {
    const { data, error } = await supabaseAdmin
      .from('missions')
      .select(`
        id, journey_id, question, question_description, project_title, project_description,
        opening_message, "order",
        planets ( id, title, label, short_title, planet_question, content, opening_message, character_figure, character_year, character_location, student_reveal_message, media_url, media_type )
      `)
      .eq('id', missionId)
      .order('created_at', { referencedTable: 'planets' })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Resolve this mission's state for THIS student's class. Missions are
    // owned by the template only (never duplicated per class), so state
    // lives in class_mission_state — find the student's class for this
    // mission's template, then look up that pair.
    const { data: enrollment } = await supabaseAdmin
      .from('student_journeys')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('template_journey_id', data.journey_id)
      .maybeSingle();

    let state: string | null = null;
    if (enrollment?.class_id) {
      const { data: stateRow } = await supabaseAdmin
        .from('class_mission_state')
        .select('state')
        .eq('class_id', enrollment.class_id)
        .eq('mission_id', missionId)
        .maybeSingle();
      state = stateRow?.state ?? 'locked';
    }

    return NextResponse.json({
      mission: {
        id:                  data.id,
        question:            data.question,
        questionDescription: data.question_description,
        projectTitle:        data.project_title,
        projectDescription:  data.project_description,
        openingMessage:      data.opening_message,
        order:               (data as any).order,
        state,
        planets: (data.planets ?? []).map((p: any) => ({
          id:                   p.id,
          title:                p.title,
          label:                p.label ?? null,
          shortTitle:           p.short_title ?? null,
          planetQuestion:       p.planet_question ?? null,
          content:              p.content,
          openingMessage:       p.opening_message ?? null,
          characterFigure:      p.character_figure ?? null,
          characterYear:        p.character_year ?? null,
          characterLocation:    p.character_location ?? null,
          studentRevealMessage: p.student_reveal_message ?? null,
          mediaUrl:             p.media_url,
          mediaType:            p.media_type,
        })),
      },
    });
  }

  if (planetId) {
    const { data, error } = await supabaseAdmin
      .from('planets')
      .select('id, title, label, short_title, planet_question, content, opening_message, character_figure, character_year, character_location, student_reveal_message, media_url, media_type, mission_id')
      .eq('id', planetId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Planet not found' }, { status: 404 });
    }

    return NextResponse.json({
      planet: {
        id:                   data.id,
        title:                data.title,
        label:                data.label ?? null,
        shortTitle:           data.short_title ?? null,
        planetQuestion:       data.planet_question ?? null,
        content:              data.content,
        openingMessage:       data.opening_message ?? null,
        characterFigure:      data.character_figure ?? null,
        characterYear:        data.character_year ?? null,
        characterLocation:    data.character_location ?? null,
        studentRevealMessage: data.student_reveal_message ?? null,
        mediaUrl:             data.media_url,
        mediaType:            data.media_type,
        missionId:            data.mission_id,
      },
    });
  }

  return NextResponse.json({ error: 'missionId or planetId required' }, { status: 400 });
}
