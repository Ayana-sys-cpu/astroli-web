/**
 * Presentable first name from a value that may have been derived from an
 * email address ("ayana.student.test", "noa123@example.com" → "Ayana", "Noa").
 * Genuine first names — no '@', dots, underscores, or digits — pass through
 * unchanged, so hyphenated or Hebrew names are never mangled.
 */
export function toDisplayFirstName(raw: string): string {
  const name = raw.trim();
  if (!/[@._\d]/.test(name)) return name;

  const localPart = name.split('@')[0] ?? '';
  // ֐-׿ = Hebrew block, so Hebrew email prefixes stay recognizable.
  const firstWord = localPart.split(/[._\-+]/).find((part) => /[a-zA-Z֐-׿]/.test(part)) ?? '';
  const letters = firstWord.replace(/\d+/g, '');
  if (!letters) return name;
  return letters.charAt(0).toUpperCase() + letters.slice(1);
}

/**
 * Language to greet a student in, chosen by the script their name is written in.
 *
 * The greeting is the one line that sits directly against the student's own
 * name, so it follows the name rather than the journey: a Latin-script name
 * gets an English greeting ("Welcome back, Amir") and a Hebrew-script name gets
 * a Hebrew one ("ברוך שובך, נילי"). Mixing the two reads as a bug — which is
 * exactly how "ברוך שובך, Amir" looked to the family that hit it.
 *
 * This is deliberately independent of the journey language: a student's name
 * doesn't change when they switch journeys, so their greeting shouldn't either.
 */
export function greetingLanguageForName(name: string): 'en' | 'he' {
  return /[֐-׿]/.test(name ?? '') ? 'he' : 'en';
}
