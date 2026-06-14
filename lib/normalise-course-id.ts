/**
 * Normalise a Google Classroom course ID to its canonical numeric form.
 *
 * The Google API always returns numeric IDs, but legacy DB rows or manual
 * inserts may have stored the base64-encoded variant (e.g. ODU4MDIzNzE2OTg1
 * instead of 858023716985). Decoding here ensures the stored value always
 * matches what the student-side enrollment lookup receives from the API.
 */
export function normaliseCourseId(id: string): string {
  if (/^[0-9]+$/.test(id)) return id;            // already numeric — no-op
  try {
    const decoded = Buffer.from(id, 'base64').toString('utf8');
    if (/^[0-9]+$/.test(decoded)) return decoded; // was base64 — use numeric
  } catch {}
  return id;                                       // unknown format — leave as-is
}
