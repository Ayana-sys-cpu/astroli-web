import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';
import { asLanguage, findEnrolledClassId, resolveClassLanguage } from '@/lib/student-language';

// GET /api/student/mission?missionId=<uuid>  — mission + all planets (for landscape hub)
// GET /api/student/mission?planetId=<uuid>   — single planet (for planet detail page)
//
// Mission and planet data are curriculum content accessible to any enrolled
// student — no per-student ownership check is needed beyond a valid session.
export async function GET(req: NextRequest) {
  const studentId = await resolveStudentIdFromRequest(req);
  if (!studentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const missionId = req.nextUrl.searchParams.get('missionId');
  const planetId  = req.nextUrl.searchParams.get('planetId');

  if (missionId) {
    const { data, error } = await supabaseAdmin
      .from('missions')
      .select(`
        id, journey_id, question, question_description, project_title, project_description,
        opening_message, language, translations, "order",
        planets ( id, title, label, short_title, planet_question, translations )
      `)
      .eq('id', missionId)
      // Planets are bulk-inserted in one transaction, so created_at is identical
      // across a mission's planets — id is a stable tiebreaker so the map's
      // PLANET 01/02/03 numbering and positions are deterministic and match every
      // other surface (Orin guide, next-planet, teacher preview).
      .order('created_at', { referencedTable: 'planets' })
      .order('id', { referencedTable: 'planets' })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Resolve this mission's state for THIS student's class. Missions are
    // owned by the template only (never duplicated per class), so state
    // lives in class_mission_state — find the student's class for this
    // mission's template, then look up that pair.
    const enrolledClassId = await findEnrolledClassId(studentId, data.journey_id);

    let state: string | null = null;
    let classLanguage: 'en' | 'he' | null = null;
    if (enrolledClassId) {
      const [stateRes, classRes] = await Promise.all([
        supabaseAdmin
          .from('class_mission_state')
          .select('state')
          .eq('class_id', enrolledClassId)
          .eq('mission_id', missionId)
          .maybeSingle(),
        supabaseAdmin
          .from('classes')
          .select('language')
          .eq('id', enrolledClassId)
          .maybeSingle(),
      ]);
      state = stateRes.data?.state ?? 'locked';
      classLanguage = classRes.data?.language === 'he' ? 'he' : 'en';
    }

    const translations = ((data as any).translations as Record<string, any>) ?? {};
    // The class language IS the answer — see lib/student-language.ts. This used
    // to also require the mission to have Hebrew translations on file, which
    // meant one untranslated journey silently flipped the whole interface (and
    // both bots) back to English for a Hebrew family. Individual untranslated
    // strings now fall back to English on their own, field by field, below.
    const language: 'en' | 'he' = classLanguage ?? 'en';
    const missionTx = translations[language] ?? {};

    return NextResponse.json({
      mission: {
        id:                  data.id,
        question:            missionTx.question            ?? data.question,
        questionDescription: missionTx.question_description ?? data.question_description,
        projectTitle:        missionTx.project_title       ?? data.project_title,
        projectDescription:  missionTx.project_description ?? data.project_description,
        openingMessage:      missionTx.opening_message     ?? data.opening_message,
        language,
        order:               (data as any).order,
        state,
        planets: (data.planets ?? []).map((p: any) => {
          const ptx = ((p.translations as Record<string, any>) ?? {})[language] ?? {};
          return {
            id:            p.id,
            title:         ptx.title           ?? p.title,
            label:         ptx.label           ?? p.label           ?? null,
            shortTitle:    ptx.short_title      ?? p.short_title     ?? null,
            planetQuestion: ptx.planet_question ?? p.planet_question ?? null,
          };
        }),
      },
    });
  }

  if (planetId) {
    const classId = req.nextUrl.searchParams.get('classId');

    const [planetRes, classRes] = await Promise.all([
      supabaseAdmin
        .from('planets')
        .select('id, title, label, short_title, planet_question, content, opening_message, character_figure, character_year, character_location, student_reveal_message, media_url, media_type, translations, mission_id, missions!mission_id ( language, translations, journey_id, question )')
        .eq('id', planetId)
        .single(),
      classId
        ? supabaseAdmin.from('classes').select('language').eq('id', classId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const { data, error } = planetRes;
    if (error || !data) {
      return NextResponse.json({ error: 'Planet not found' }, { status: 404 });
    }

    const missionData = (data as any).missions;
    let classLang = (classRes as any).data?.language as string | undefined;

    // When classId wasn't provided (e.g. AvatarBot floating panel), resolve the
    // class language from the student's enrollment — same as the missionId path.
    if (!classLang && missionData?.journey_id) {
      const enrolledClassId = await findEnrolledClassId(studentId, missionData.journey_id);
      if (enrolledClassId) classLang = await resolveClassLanguage(enrolledClassId);
    }

    // Class language wins. Default to English when no class is resolvable —
    // unenrolled contexts such as the AvatarBot panel must not inherit another
    // class's language.
    const missionLanguage: 'en' | 'he' = asLanguage(classLang);

    const ptx = (((data as any).translations as Record<string, any>) ?? {})[missionLanguage] ?? {};

    const missionTx = ((missionData?.translations as Record<string, any>) ?? {})[missionLanguage] ?? {};
    return NextResponse.json({
      planet: {
        id:                   data.id,
        title:                ptx.title           ?? data.title,
        label:                ptx.label           ?? data.label           ?? null,
        shortTitle:           ptx.short_title     ?? data.short_title     ?? null,
        planetQuestion:       ptx.planet_question ?? data.planet_question ?? null,
        missionTitle:         missionTx.question  ?? missionData?.question ?? null,
        content:              ptx.content         ?? data.content,
        openingMessage:       ptx.opening_message ?? data.opening_message ?? null,
        characterFigure:      ptx.character_figure   ?? data.character_figure  ?? null,
        characterYear:        data.character_year    ?? null,
        characterLocation:    ptx.character_location ?? data.character_location ?? null,
        studentRevealMessage: ptx.student_reveal_message ?? data.student_reveal_message ?? null,
        mediaUrl:             data.media_url,
        mediaType:            data.media_type,
        missionId:            data.mission_id,
        missionLanguage,
      },
    });
  }

  return NextResponse.json({ error: 'missionId or planetId required' }, { status: 400 });
}
