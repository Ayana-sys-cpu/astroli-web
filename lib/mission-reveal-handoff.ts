// One-shot handoff from the home orbit to the landscape reveal overlay.
//
// Why this exists: the home screen already holds each mission's question and
// order (it renders them in the orbit hover tooltip), yet tapping a mission
// navigates to /landscape which re-fetches everything from scratch — so the
// reveal overlay waits on a journey → mission round-trip before it can paint
// even though the text was already in memory one screen back.  We carry that
// text forward on navigation; the landscape page paints the overlay from it the
// moment the journey check confirms a first visit, instead of waiting on the
// /api/student/mission fetch.  The authoritative fetch still runs and reconciles
// the full mission (planets, descriptions) a beat later, underneath the overlay.
//
// One-shot: read once and cleared.  sessionStorage is per-tab and holds only the
// student's own mission text (no COPPA/FERPA concern), and a mismatched or stale
// entry is ignored because consumption is gated on missionId equality.

export interface MissionRevealHandoff {
  missionId: string;
  question:  string;
  order:     number;
  language:  'en' | 'he';
}

// Bump the version suffix if the shape changes, so stale-shaped entries from an
// older deploy are ignored rather than consumed.
const KEY = 'mission-reveal-handoff:v1';

export function writeMissionRevealHandoff(h: MissionRevealHandoff): void {
  try {
    if (!h.missionId || !h.question) return;
    sessionStorage.setItem(KEY, JSON.stringify(h));
  } catch {
    // Quota / serialization failure is non-fatal — the reveal just falls back to
    // painting after the mission fetch, as it did before this handoff existed.
  }
}

export function readMissionRevealHandoff(): MissionRevealHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MissionRevealHandoff;
    if (!parsed?.missionId || !parsed.question) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMissionRevealHandoff(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
