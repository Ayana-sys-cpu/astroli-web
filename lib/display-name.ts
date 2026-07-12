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
