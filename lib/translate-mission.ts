// Translates a mission and all its planets into Hebrew using OpenAI.
// Called once when the teacher sets missions.language = 'he'.
// Results are stored in missions.translations and planets.translations so
// student API routes can serve Hebrew without re-translating on every request.

import OpenAI from 'openai';
import { supabaseAdmin } from './supabase-server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MissionRow {
  id: string;
  question: string;
  question_description: string | null;
  opening_message: string | null;
  opening_message_2: string | null;
  project_title: string | null;
  project_description: string | null;
  world_brief_summary: string | null;
  world_brief_items: Array<{ title: string; body: string }> | null;
  qa_answers: string[] | null;
  mission_qa_answers: string[] | null;
  chapter: string | null;
  mission_brief: string | null;
}

interface PlanetRow {
  id: string;
  title: string;
  label: string | null;
  short_title: string | null;
  planet_question: string | null;
  content: string;
  opening_message: string | null;
  student_reveal_message: string | null;
  hint: string | null;
}

// Payload sent to OpenAI for translation — single request covers mission + all planets.
interface TranslationPayload {
  mission: {
    question: string;
    question_description: string;
    opening_message: string;
    opening_message_2: string;
    project_title: string;
    project_description: string;
    world_brief_summary: string;
    world_brief_items: Array<{ title: string; body: string }>;
    qa_answers: string[];
    mission_qa_answers: string[];
    chapter: string;
    mission_brief: string;
  };
  planets: Array<{
    id: string;
    title: string;
    label: string;
    short_title: string;
    planet_question: string;
    content: string;
    opening_message: string;
    student_reveal_message: string;
    hint: string;
  }>;
}

// Translates all fields in the payload and returns them in the same structure.
async function translatePayload(payload: TranslationPayload): Promise<TranslationPayload> {
  const prompt = `You are a professional Hebrew translator for an educational platform for Israeli students aged 13–15.
Translate the following JSON from English to Hebrew. Keep JSON keys in English — only translate the values.
Transliterate every person's name into Hebrew (e.g. "Antoine Lavoisier" → "אנטואן לבואזייה", "James Joule" → "ג'יימס ג'אול"). Never leave a name in Latin script.
Preserve all formatting, line breaks (\\n), and HTML tags exactly.
Return ONLY valid JSON with no explanation.

${JSON.stringify(payload, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI translation');
  return JSON.parse(content) as TranslationPayload;
}

interface TeachingGoalRow {
  id:          string;
  description: string;
  translations: unknown;
}

// Translates the still-untranslated teaching goals for a set of planets and
// writes translations.he.description back onto each planet_teaching_goals row.
// Safe to call repeatedly — already-translated goals are skipped.
export async function translateTeachingGoals(planetIds: string[]): Promise<void> {
  if (planetIds.length === 0) return;

  const { data: goals, error } = await supabaseAdmin
    .from('planet_teaching_goals')
    .select('id, description, translations')
    .in('planet_id', planetIds);

  if (error) throw new Error(`Teaching goals fetch failed: ${error.message}`);

  const untranslated = ((goals ?? []) as unknown as TeachingGoalRow[]).filter(g => {
    const tx = (g.translations as Record<string, any>) ?? {};
    return !tx.he?.description;
  });

  if (untranslated.length === 0) return;

  const prompt = `You are a professional Hebrew translator for an educational platform for Israeli students aged 13–15.
Translate the following teaching-goal descriptions from English to Hebrew. Keep the JSON keys (ids) exactly as given — only translate the values.
Transliterate every person's name into Hebrew (e.g. "Antoine Lavoisier" → "אנטואן לבואזייה", "James Joule" → "ג'יימס ג'אול"). Never leave a name in Latin script.
Return ONLY valid JSON with no explanation: an object mapping each id to its Hebrew translation.

${JSON.stringify(Object.fromEntries(untranslated.map(g => [g.id, g.description])), null, 2)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI translation');
  const translated = JSON.parse(content) as Record<string, string>;

  await Promise.all(
    untranslated.map(async g => {
      const description = translated[g.id];
      if (!description) return;
      const { error: updErr } = await supabaseAdmin
        .from('planet_teaching_goals')
        .update({ translations: { he: { description } } })
        .eq('id', g.id);
      if (updErr) throw new Error(`Teaching goal ${g.id} translation save failed: ${updErr.message}`);
    }),
  );
}

// Translates a mission and all its planets, storing results in the DB.
// Safe to call multiple times — will overwrite existing translations.he data.
export async function translateMission(missionId: string): Promise<void> {
  // Fetch mission fields that need translation.
  const { data: mission, error: mErr } = await supabaseAdmin
    .from('missions')
    .select(`
      id, question, question_description, opening_message, opening_message_2,
      project_title, project_description, world_brief_summary, world_brief_items,
      qa_answers, mission_qa_answers, chapter, mission_brief
    `)
    .eq('id', missionId)
    .single();

  if (mErr || !mission) throw new Error(`Mission ${missionId} not found: ${mErr?.message}`);

  // Fetch all planets for this mission.
  const { data: planets, error: pErr } = await supabaseAdmin
    .from('planets')
    .select('id, title, label, short_title, planet_question, content, opening_message, student_reveal_message, hint')
    .eq('mission_id', missionId);

  if (pErr) throw new Error(`Planets fetch failed: ${pErr.message}`);

  const m = mission as unknown as MissionRow;

  const payload: TranslationPayload = {
    mission: {
      question:             m.question,
      question_description: m.question_description ?? '',
      opening_message:      m.opening_message ?? '',
      opening_message_2:    m.opening_message_2 ?? '',
      project_title:        m.project_title ?? '',
      project_description:  m.project_description ?? '',
      world_brief_summary:  m.world_brief_summary ?? '',
      world_brief_items:    (m.world_brief_items ?? []) as Array<{ title: string; body: string }>,
      qa_answers:           m.qa_answers ?? [],
      mission_qa_answers:   m.mission_qa_answers ?? [],
      chapter:              m.chapter ?? '',
      mission_brief:        m.mission_brief ?? '',
    },
    planets: (planets ?? []).map((p) => {
      const row = p as unknown as PlanetRow;
      return {
        id:                     row.id,
        title:                  row.title,
        label:                  row.label ?? '',
        short_title:            row.short_title ?? '',
        planet_question:        row.planet_question ?? '',
        content:                row.content,
        opening_message:        row.opening_message ?? '',
        student_reveal_message: row.student_reveal_message ?? '',
        hint:                   row.hint ?? '',
      };
    }),
  };

  const translated = await translatePayload(payload);

  // Store mission translation and flip the mission's display language to 'he' —
  // student API routes gate translation lookup on missions.language, so without
  // this the translations sit unused and students keep seeing English.
  const { error: mUpdateErr } = await supabaseAdmin
    .from('missions')
    .update({ translations: { he: translated.mission }, language: 'he' })
    .eq('id', missionId);

  if (mUpdateErr) throw new Error(`Mission translation save failed: ${mUpdateErr.message}`);

  // Store each planet's translation (parallel writes).
  await Promise.all(
    translated.planets.map(async (tp) => {
      const { error } = await supabaseAdmin
        .from('planets')
        .update({ translations: { he: tp } })
        .eq('id', tp.id);
      if (error) throw new Error(`Planet ${tp.id} translation save failed: ${error.message}`);
    }),
  );

  // Teaching goals aren't part of the payload above (they're generated
  // separately from planet content) — translate them in their own pass.
  await translateTeachingGoals(translated.planets.map(tp => tp.id));
}
