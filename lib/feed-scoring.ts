export type EditType = 'did_you_know' | 'inspiring_human' | 'real_world_connection';

export interface FeedEdit {
  id: string;
  edit_type: EditType;
  planet_id: string;
  interest_theme: string | null;
  hook: string;
  body: string;
  bridge: string;
  media_url: string;
  media_type: 'image' | 'video';
  media_credit: string;
  interest_theme_label?: string | null;
  /** Podcast episode (amendment 2026-07-20) — null = no podcast button. */
  audio_url?: string | null;
  /** Background music track from the curated pack — null = silent card. */
  music_url?: string | null;
}

export interface StudentContext {
  activePlanetId: string | null;
  interestTheme: string | null;
  seenEditIds: Set<string>;
  engagementCounts: Record<EditType, number>;
}

interface ScoredEdit extends FeedEdit {
  score: number;
}

export function scoreCandidates(
  candidates: FeedEdit[],
  ctx: StudentContext,
): FeedEdit[] {
  const unseen = candidates.filter((e) => !ctx.seenEditIds.has(e.id));

  const scored: ScoredEdit[] = unseen.map((edit) => {
    let score = 0;

    if (ctx.activePlanetId && edit.planet_id === ctx.activePlanetId) score += 50;
    if (ctx.interestTheme && edit.interest_theme === ctx.interestTheme) score += 30;

    const topType = topEngagedType(ctx.engagementCounts);
    if (topType && edit.edit_type === topType) score += 20;

    score += 15;
    score += Math.floor(Math.random() * 11);

    return { ...edit, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return applyCompositionRules(scored);
}

function topEngagedType(counts: Record<EditType, number>): EditType | null {
  const entries = Object.entries(counts) as [EditType, number][];
  const best = entries.reduce<[EditType, number] | null>((acc, cur) => {
    if (!acc || cur[1] > acc[1]) return cur;
    return acc;
  }, null);
  return best && best[1] > 0 ? best[0] : null;
}

function applyCompositionRules(ordered: ScoredEdit[]): FeedEdit[] {
  const result: FeedEdit[] = [];
  let lastType: EditType | null = null;
  let connectionCount = 0;
  let totalCount = 0;

  const remaining = [...ordered];

  while (remaining.length > 0 && result.length < 12) {
    totalCount++;

    const needConnection =
      totalCount % 20 === 0 && connectionCount === 0 && totalCount > 0;

    let chosen: ScoredEdit | undefined;

    if (needConnection) {
      const connectionIdx = remaining.findIndex((e) => e.edit_type === 'real_world_connection');
      if (connectionIdx !== -1) {
        chosen = remaining.splice(connectionIdx, 1)[0];
      }
    }

    if (!chosen) {
      const idx = remaining.findIndex(
        (e) => e.edit_type !== lastType,
      );
      if (idx !== -1) {
        chosen = remaining.splice(idx, 1)[0];
      } else {
        chosen = remaining.shift();
      }
    }

    if (!chosen) break;

    lastType = chosen.edit_type;
    if (chosen.edit_type === 'real_world_connection') connectionCount++;

    result.push(chosen);
  }

  return result;
}
