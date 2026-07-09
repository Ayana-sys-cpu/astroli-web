import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolveStudentIdFromRequest } from '@/lib/auth';

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
        planets ( id, title, label, short_title, planet_question, content, opening_message, character_figure, character_year, character_location, student_reveal_message, media_url, media_type, translations )
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
      .from('student_classes')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('template_journey_id', data.journey_id)
      .maybeSingle();

    let state: string | null = null;
    let classLanguage: 'en' | 'he' | null = null;
    if (enrollment?.class_id) {
      const [stateRes, classRes] = await Promise.all([
        supabaseAdmin
          .from('class_mission_state')
          .select('state')
          .eq('class_id', enrollment.class_id)
          .eq('mission_id', missionId)
          .maybeSingle(),
        supabaseAdmin
          .from('classes')
          .select('language')
          .eq('id', enrollment.class_id)
          .maybeSingle(),
      ]);
      state = stateRes.data?.state ?? 'locked';
      classLanguage = classRes.data?.language === 'he' ? 'he' : 'en';
    }

    const missionBaseLang: 'en' | 'he' = (data as any).language === 'he' ? 'he' : 'en';
    const translations = ((data as any).translations as Record<string, any>) ?? {};
    const heTranslations = translations['he'] ?? {};
    const hasHeTranslations = Object.keys(heTranslations).length > 0;
    // Only honour classLanguage='he' when the mission has Hebrew translations;
    // otherwise fall back to the mission's authored language so the bot and
    // content stay in sync.
    const language: 'en' | 'he' = classLanguage === 'he' && hasHeTranslations ? 'he'
      : classLanguage === 'en' ? 'en'
      : missionBaseLang;
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
            id:                   p.id,
            title:                ptx.title          ?? p.title,
            label:                ptx.label          ?? p.label          ?? null,
            shortTitle:           ptx.short_title    ?? p.short_title    ?? null,
            planetQuestion:       ptx.planet_question ?? p.planet_question ?? null,
            content:              ptx.content        ?? p.content,
            openingMessage:       ptx.opening_message ?? p.opening_message ?? null,
            characterFigure:      p.character_figure  ?? null,
            characterYear:        p.character_year    ?? null,
            characterLocation:    p.character_location ?? null,
            studentRevealMessage: ptx.student_reveal_message ?? p.student_reveal_message ?? null,
            mediaUrl:             p.media_url,
            mediaType:            p.media_type,
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
        .select('id, title, label, short_title, planet_question, content, opening_message, character_figure, character_year, character_location, student_reveal_message, media_url, media_type, translations, mission_id, missions!mission_id ( language, translations, journey_id )')
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
    if (!classLang) {
      const journeyId = missionData?.journey_id;
      if (journeyId) {
        const { data: enrollment } = await supabaseAdmin
          .from('student_classes')
          .select('class_id')
          .eq('student_id', studentId)
          .eq('template_journey_id', journeyId)
          .maybeSingle();
        if (enrollment?.class_id) {
          const { data: classRow } = await supabaseAdmin
            .from('classes')
            .select('language')
            .eq('id', enrollment.class_id)
            .maybeSingle();
          classLang = classRow?.language ?? undefined;
        }
      }
    }

    const missionLanguage: 'en' | 'he' = classLang === 'he' ? 'he' : classLang === 'en' ? 'en' : (missionData?.language === 'he' ? 'he' : 'en');

    const ptx = (((data as any).translations as Record<string, any>) ?? {})[missionLanguage] ?? {};

    return NextResponse.json({
      planet: {
        id:                   data.id,
        title:                ptx.title           ?? data.title,
        label:                ptx.label           ?? data.label           ?? null,
        shortTitle:           ptx.short_title     ?? data.short_title     ?? null,
        planetQuestion:       ptx.planet_question ?? data.planet_question ?? null,
        content:              ptx.content         ?? data.content,
        openingMessage:       ptx.opening_message ?? data.opening_message ?? null,
        characterFigure:      data.character_figure  ?? null,
        characterYear:        data.character_year    ?? null,
        characterLocation:    data.character_location ?? null,
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
