import { supabaseAdmin } from '@/lib/supabase-server';
import type { StudentPlace } from '@/lib/spotlight-ranking';

interface PlanetRow { id: string; created_at: string }
interface ClassRow { id: string; journeys: { missions: { id: string; planets: PlanetRow[] }[] } | null }

export interface PlaceInput {
  classIds: string[];
  completedPlanetIds: Set<string>;
  interests: unknown;
  seenEditIds: Set<string>;
}

/**
 * Where this student is: the planet they are on, the ones behind, the ones ahead.
 *
 * Shared by the home curiosity panel and the Master launchpad — both rank the
 * same edits against the same sense of place, so this lives in one file rather
 * than drifting into two.
 */
export async function buildPlace(input: PlaceInput): Promise<StudentPlace> {
  const first = Array.isArray(input.interests) ? input.interests[0] : null;

  const place: StudentPlace = {
    activePlanetId: null,
    completedPlanetIds: input.completedPlanetIds,
    journeyPlanetIds: new Set<string>(),
    interestTheme: typeof first === 'string' && first.trim() ? first : null,
    seenEditIds: input.seenEditIds,
  };
  if (input.classIds.length === 0) return place;

  const [classes, activeState] = await Promise.all([
    supabaseAdmin
      .from('classes')
      .select('id, journeys(missions(id, planets(id, created_at)))')
      .in('id', input.classIds),
    supabaseAdmin
      .from('class_mission_state')
      .select('mission_id')
      .in('class_id', input.classIds)
      .eq('state', 'active'),
  ]);

  const activeMissionId = activeState.data?.[0]?.mission_id ?? null;

  for (const row of (classes.data ?? []) as unknown as ClassRow[]) {
    for (const mission of row.journeys?.missions ?? []) {
      for (const planet of mission.planets ?? []) place.journeyPlanetIds.add(planet.id);

      if (mission.id === activeMissionId) {
        // Planets carry no explicit order column and bulk inserts share a
        // created_at, so id breaks the tie — same rule the rest of the app uses.
        const ordered = [...(mission.planets ?? [])].sort(
          (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
        );
        const current = ordered.find((p) => !input.completedPlanetIds.has(p.id));
        place.activePlanetId = current?.id ?? ordered[0]?.id ?? null;
      }
    }
  }

  return place;
}
