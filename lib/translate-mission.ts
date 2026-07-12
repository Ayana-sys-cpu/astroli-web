// Translates a mission and all its planets into Hebrew using OpenAI.
// Called once when the teacher sets missions.language = 'he'.
// Results are stored in missions.translations and planets.translations so
// student API routes can serve Hebrew without re-translating on every request.

import OpenAI from 'openai';
import { supabaseAdmin } from './supabase-server';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

interface MissionRow {
  id: string;
  question: string;
  question_description: string | null;
  opening_message: string | null;
  opening_message_2: string | null;
  project_title: string | null;
  project_description: string | null;
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
  character_figure: string | null;
  character_location: string | null;
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
    character_figure: string;
    character_location: string;
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

  const response = await getOpenAI().chat.completions.create({
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
  slug:        string;
  description: string;
  translations: unknown;
}

// Mirrors slugToLabel in the mission API route — the English label shown for a
// key term is derived from the goal's slug, so the Hebrew slug_label must be a
// translation of that same label.
function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Translates the still-untranslated teaching goals for a set of planets and
// writes translations.he.description + translations.he.slug_label back onto
// each planet_teaching_goals row.
// Safe to call repeatedly — already-translated goals are skipped.
export async function translateTeachingGoals(planetIds: string[]): Promise<void> {
  if (planetIds.length === 0) return;

  const { data: goals, error } = await supabaseAdmin
    .from('planet_teaching_goals')
    .select('id, slug, description, translations')
    .in('planet_id', planetIds);

  if (error) throw new Error(`Teaching goals fetch failed: ${error.message}`);

  const untranslated = ((goals ?? []) as unknown as TeachingGoalRow[]).filter(g => {
    const tx = (g.translations as Record<string, any>) ?? {};
    return !tx.he?.description || !tx.he?.slug_label;
  });

  if (untranslated.length === 0) return;

  const prompt = `You are a professional Hebrew translator for an educational platform for Israeli students aged 13–15.
Translate the following teaching goals from English to Hebrew. Keep the JSON keys (ids and field names) exactly as given — only translate the values.
For each goal, "slug_label" is the short term/concept name shown to students and "description" is its explanation — translate both. Keep slug_label short (a term, not a sentence).
Transliterate every person's name into Hebrew (e.g. "Antoine Lavoisier" → "אנטואן לבואזייה", "James Joule" → "ג'יימס ג'אול"). Never leave a name in Latin script.
Return ONLY valid JSON with no explanation: an object mapping each id to { "slug_label": ..., "description": ... } in Hebrew.

${JSON.stringify(
    Object.fromEntries(untranslated.map(g => [g.id, { slug_label: slugToLabel(g.slug), description: g.description }])),
    null,
    2,
  )}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI translation');
  const translated = JSON.parse(content) as Record<string, { slug_label?: string; description?: string }>;

  await Promise.all(
    untranslated.map(async g => {
      const description = translated[g.id]?.description;
      const slug_label  = translated[g.id]?.slug_label;
      if (!description) return;
      const { error: updErr } = await supabaseAdmin
        .from('planet_teaching_goals')
        .update({ translations: { he: { description, ...(slug_label ? { slug_label } : {}) } } })
        .eq('id', g.id);
      if (updErr) throw new Error(`Teaching goal ${g.id} translation save failed: ${updErr.message}`);
    }),
  );
}

interface CharacterRow {
  id:            string;
  name:          string;
  bio:           string;
  era:           string;
  location:      string;
  voice_profile: string;
  teaching_goal: string;
  translations:  unknown;
}

// Translates the still-untranslated planet characters for a set of planets and
// writes translations.he.{name, bio, era, location, voice_profile, teaching_goal}
// back onto each planet_characters row. The character name is transliterated,
// not translated. Safe to call repeatedly — already-translated rows are skipped.
export async function translatePlanetCharacters(planetIds: string[]): Promise<void> {
  if (planetIds.length === 0) return;

  const { data: characters, error } = await supabaseAdmin
    .from('planet_characters')
    .select('id, name, bio, era, location, voice_profile, teaching_goal, translations')
    .in('planet_id', planetIds);

  if (error) throw new Error(`Planet characters fetch failed: ${error.message}`);

  const untranslated = ((characters ?? []) as unknown as CharacterRow[]).filter(c => {
    const tx = (c.translations as Record<string, any>) ?? {};
    return !tx.he?.name || !tx.he?.bio;
  });

  if (untranslated.length === 0) return;

  const prompt = `You are a professional Hebrew translator for an educational platform for Israeli students aged 13–15.
Translate the following historical character profiles from English to Hebrew. Keep the JSON keys (ids and field names) exactly as given — only translate the values.
Transliterate every person's name into Hebrew (e.g. "Antoine Lavoisier" → "אנטואן לבואזייה"). Never leave a name in Latin script.
"voice_profile" and "teaching_goal" describe how the character speaks and what they teach — translate them faithfully.
Return ONLY valid JSON with no explanation: an object mapping each id to { "name": ..., "bio": ..., "era": ..., "location": ..., "voice_profile": ..., "teaching_goal": ... } in Hebrew.

${JSON.stringify(
    Object.fromEntries(untranslated.map(c => [c.id, {
      name:          c.name,
      bio:           c.bio,
      era:           c.era,
      location:      c.location,
      voice_profile: c.voice_profile,
      teaching_goal: c.teaching_goal,
    }])),
    null,
    2,
  )}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI translation');
  const translated = JSON.parse(content) as Record<string, Partial<Omit<CharacterRow, 'id' | 'translations'>>>;

  await Promise.all(
    untranslated.map(async c => {
      const he = translated[c.id];
      if (!he?.name || !he?.bio) return;
      const { error: updErr } = await supabaseAdmin
        .from('planet_characters')
        .update({ translations: { he } })
        .eq('id', c.id);
      if (updErr) throw new Error(`Character ${c.id} translation save failed: ${updErr.message}`);
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
      project_title, project_description,
      qa_answers, mission_qa_answers, chapter, mission_brief
    `)
    .eq('id', missionId)
    .single();

  if (mErr || !mission) throw new Error(`Mission ${missionId} not found: ${mErr?.message}`);

  // Fetch all planets for this mission.
  const { data: planets, error: pErr } = await supabaseAdmin
    .from('planets')
    .select('id, title, label, short_title, planet_question, content, opening_message, student_reveal_message, hint, character_figure, character_location')
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
        character_figure:       row.character_figure ?? '',
        character_location:     row.character_location ?? '',
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

  // Teaching goals and planet characters aren't part of the payload above
  // (they're generated separately from planet content) — translate them in
  // their own passes.
  await translateTeachingGoals(translated.planets.map(tp => tp.id));
  await translatePlanetCharacters(translated.planets.map(tp => tp.id));
}
