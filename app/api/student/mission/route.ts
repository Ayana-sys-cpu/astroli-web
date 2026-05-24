import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/student/mission?missionId=<uuid>  — mission + all plants (for landscape hub)
// GET /api/student/mission?plantId=<uuid>    — single plant (for planet detail page)

export async function GET(req: NextRequest) {
  const missionId = req.nextUrl.searchParams.get('missionId');
  const plantId   = req.nextUrl.searchParams.get('plantId');

  if (missionId) {
    const { data, error } = await supabaseAdmin
      .from('missions')
      .select(`
        id, question, question_description, project_title, project_description,
        opening_message, mission_order, state,
        plants ( id, title, label, short_title, planet_question, content, opening_message, media_url, media_type )
      `)
      .eq('id', missionId)
      .order('created_at', { referencedTable: 'plants' })
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    return NextResponse.json({
      mission: {
        id:                  data.id,
        question:            data.question,
        questionDescription: data.question_description,
        projectTitle:        data.project_title,
        projectDescription:  data.project_description,
        openingMessage:      data.opening_message,
        order:               data.mission_order,
        state:               data.state,
        plants: (data.plants ?? []).map((p: any) => ({
          id:             p.id,
          title:          p.title,
          label:          p.label ?? null,
          shortTitle:     p.short_title ?? null,
          planetQuestion: p.planet_question ?? null,
          content:        p.content,
          openingMessage: p.opening_message,
          mediaUrl:       p.media_url,
          mediaType:      p.media_type,
        })),
      },
    });
  }

  if (plantId) {
    const { data, error } = await supabaseAdmin
      .from('plants')
      .select('id, title, label, short_title, planet_question, content, opening_message, media_url, media_type, mission_id')
      .eq('id', plantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Plant not found' }, { status: 404 });
    }

    return NextResponse.json({
      plant: {
        id:             data.id,
        title:          data.title,
        label:          data.label ?? null,
        shortTitle:     data.short_title ?? null,
        planetQuestion: data.planet_question ?? null,
        content:        data.content,
        openingMessage: data.opening_message,
        mediaUrl:       data.media_url,
        mediaType:      data.media_type,
        missionId:      data.mission_id,
      },
    });
  }

  return NextResponse.json({ error: 'missionId or plantId required' }, { status: 400 });
}
