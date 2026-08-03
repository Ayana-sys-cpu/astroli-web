// Single source of truth for "what language does this student see?"
//
// The answer is ALWAYS the language of the class they are enrolled in.
//
// It is never `missions.language`. That column describes the language the
// template was authored in and is shared by every class built on that template,
// so reading it leaks one family's language choice into every other class on the
// same journey — a Hebrew family switching a template to Hebrew would flip a
// teacher's English school class to Hebrew too. Several routes used to gate on
// it; they now all call through here.
//
// Translation availability is deliberately NOT part of this decision. A Hebrew
// class stays Hebrew even when a mission has no Hebrew copy yet — the per-field
// `translations.he.x ?? x` fallbacks degrade individual strings to English on
// their own. Gating the whole language on translation availability used to make
// the entire interface (and both bots) silently revert to English, which is how
// an untranslated journey turned into a fully English experience for a Hebrew
// family.

import { supabaseAdmin } from '@/lib/supabase-server';

export type StudentLanguage = 'en' | 'he';

/** Narrow an arbitrary DB/query-param value to a supported language. */
export function asLanguage(value: unknown): StudentLanguage {
  return value === 'he' ? 'he' : 'en';
}

// A student can hold more than one enrollment on the same template journey
// (e.g. a school class and a family class) — data predating the
// one-per-template unique index still allows it. maybeSingle() without a
// limit errors on multiple rows and silently drops the class context, so
// pick the most recent enrollment deterministically instead.
export async function findEnrolledClassId(
  studentId: string,
  templateJourneyId: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('student_classes')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('template_journey_id', templateJourneyId)
    .order('enrolled_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) console.error('[student-language] enrollment lookup error:', error);
  return data?.class_id ?? null;
}

/**
 * Language of a PERSON — the answer for every surface that is not inside a
 * specific journey: app chrome, Orin on the home screen, parent emails, and the
 * default a new enrollment inherits.
 *
 * This is the ONLY permitted person-level read of `users.language`. Querying the
 * column directly is how the enrollment-level reads below drifted in the first
 * place.
 *
 * It exists because there was previously no such thing as "this person's
 * language": language lived only on an enrollment, so anything outside a journey
 * guessed. The guess was `journeys[0].language` — whichever journey happened to
 * sort first — and Orin inherited it.
 *
 * English when the person can't be resolved. A caller that reaches this fallback
 * has a bug: every live user was backfilled (see
 * specs/shared/language/baseline.md) and every new user is stamped at signup or
 * invite acceptance.
 */
export async function resolveUserLanguage(userId: string | null | undefined): Promise<StudentLanguage> {
  if (!userId) return 'en';

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('language')
    .eq('id', userId)
    .maybeSingle();

  if (error) console.error('[student-language] user language lookup error:', error);
  return asLanguage(data?.language);
}

/** Language of a specific class. English when the class can't be resolved. */
export async function resolveClassLanguage(classId: string | null | undefined): Promise<StudentLanguage> {
  if (!classId) return 'en';

  const { data, error } = await supabaseAdmin
    .from('classes')
    .select('language')
    .eq('id', classId)
    .maybeSingle();

  if (error) console.error('[student-language] class language lookup error:', error);
  return asLanguage(data?.language);
}

/**
 * Language for a student on a given template journey, via their enrollment.
 * English when they aren't enrolled — unenrolled contexts (e.g. the floating
 * bot panel) must not inherit another class's language.
 */
export async function resolveStudentLanguage(
  studentId: string,
  templateJourneyId: string,
): Promise<StudentLanguage> {
  const classId = await findEnrolledClassId(studentId, templateJourneyId);
  return resolveClassLanguage(classId);
}

/**
 * Language for a batch of missions, keyed by mission id, resolved through the
 * student's enrollment on each mission's template. Missions on the same
 * template share one class lookup.
 */
export async function resolveLanguageByMission(
  studentId: string,
  missions: Array<{ id: string; journey_id: string }>,
): Promise<Record<string, StudentLanguage>> {
  const journeyIds = Array.from(new Set(missions.map(m => m.journey_id).filter(Boolean)));
  const byJourney: Record<string, StudentLanguage> = {};

  await Promise.all(
    journeyIds.map(async journeyId => {
      byJourney[journeyId] = await resolveStudentLanguage(studentId, journeyId);
    }),
  );

  const byMission: Record<string, StudentLanguage> = {};
  for (const m of missions) byMission[m.id] = byJourney[m.journey_id] ?? 'en';
  return byMission;
}
