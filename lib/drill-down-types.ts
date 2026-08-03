// src/astroli-web/lib/drill-down-types.ts

import type { SignalType } from '@/lib/signals';

// The real Perkins Thinking Scale used by the bot to score students — see
// src/astorli-bot/lib/planet-voice-prompt.ts's PERKINS_LEVELS, the source of truth.
// Kept in sync by hand since astroli-web and astorli-bot are separate apps with no
// shared package.
export type PerkinsLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const PERKINS_LEVEL_NAMES: Record<PerkinsLevel, string> = {
  1: 'Explanation',
  2: 'Exemplification',
  3: 'Comparison',
  4: 'Contextualization',
  5: 'Application',
  6: 'Justification',
  7: 'Generalization',
};

// What the level MEANS, in words a parent has. Teachers keep the level itself on
// the badge; both audiences now read the same row.
//
// The concept name alone ("Conservation of mass") told neither audience what the
// child actually demonstrated. These do. Static strings — no AI, no cost.
export const PERKINS_PLAIN_TITLES: Record<PerkinsLevel, string> = {
  1: 'Can explain it in their own words',
  2: 'Can give their own example',
  3: 'Can compare it to something else',
  4: 'Can say when and where it applies',
  5: 'Can use it to solve something new',
  6: "Can argue why it's true",
  7: 'Can carry the idea into another subject',
};

/** Shown where a topic was finished without reaching this goal's target level. */
export const PLAIN_TITLE_UNREACHED = 'Still finding their feet here';

// One-line hover explanations. Before these, the only tooltip in the drill-down
// restated the level name and its ordinal — which explains nothing to anyone who
// doesn't already know the scale.
export const PERKINS_TOOLTIPS: Record<PerkinsLevel, string> = {
  1: 'Can say what it is in their own words',
  2: 'Can give their own example of it',
  3: "Can say how it's like or unlike something else",
  4: 'Can say when and where it applies',
  5: 'Can use it to solve something new',
  6: "Can argue why it's true, with evidence",
  7: 'Can carry the idea into a whole other subject',
};

export const UNREACHED_TOOLTIP =
  "Completed the topic, but hasn't shown this one yet — not a failure";

/** The plain-language title for a row, from its performance. */
export function plainTitle(p: PerformanceInfo | null): string {
  if (!p || p.isGraceCompletion || !p.level) return PLAIN_TITLE_UNREACHED;
  return PERKINS_PLAIN_TITLES[p.level];
}

/** The hover explanation for a badge, from its performance. */
export function performanceTooltip(p: PerformanceInfo | null): string {
  if (!p || p.isGraceCompletion || !p.level) return UNREACHED_TOOLTIP;
  return PERKINS_TOOLTIPS[p.level];
}

export type PlanetStatus = 'not_started' | 'in_progress' | 'completed' | 'pending_activation';

export function toPerkinsLevel(value: number | null | undefined): PerkinsLevel | null {
  return typeof value === 'number' && value >= 1 && value <= 7 ? (value as PerkinsLevel) : null;
}

// A planet/goal's demonstrated performance: either a Perkins level, a grace
// completion (planet finished without reaching a goal's target level), or
// nothing yet (null upstream, no PerformanceInfo at all).
export interface PerformanceInfo {
  level: PerkinsLevel | null;
  isGraceCompletion: boolean;
}

export function performanceLabel(p: PerformanceInfo | null): string {
  if (!p) return 'Not started';
  if (p.isGraceCompletion) return 'Finished with support';
  if (p.level) return PERKINS_LEVEL_NAMES[p.level];
  return 'Not started';
}

export interface GoalSummary {
  id: string;
  displayTitle: string;
  termName: string | null;
  insightText: string | null;
  conversationEvidence: string | null;
  studentAddition: string | null;
  performance: PerformanceInfo;
}

export interface SubjectSummary {
  planetId: string;
  planetTitle: string;
  missionId: string;
  missionTitle: string;
  missionOrder: number;
  journeyId: string;
  journeyTitle: string;
  status: PlanetStatus;
  performance: PerformanceInfo | null;
  completedAt: string | null;
  goals: GoalSummary[];
  teachingGoalCount: number;
  /** For in_progress planets: how many goals have been explored so far (non-null perkins_map entries). 0 otherwise. */
  discoveredGoalCount: number;
}

export interface DrillDownStudent {
  id: string;
  name: string;
  initials: string;
  grade: string | null;
  journeyEnrollments: { journeyId: string; title: string }[];
}

export interface MissionMeta {
  id: string;
  title: string;
  order: number;
  state: string;
}

export interface CrossJourneyStats {
  peakPerformance: PerformanceInfo | null;
  peakJourneyTitle: string | null;
  activeMissionsCount: number;
  totalMissionsCount: number;
  weeklyExplorationChangePercent: number | null;
}

export interface DrillDownResponse {
  student: DrillDownStudent;
  subjects: SubjectSummary[];
  journeys: { id: string; title: string }[];
  activeMissionByJourney: Record<string, string>;
  missionsByJourney: Record<string, MissionMeta[]>;
  signalByJourney: Record<string, SignalType | null>;
  crossJourneyStats: CrossJourneyStats;
  prewrittenMessage: string;
}

// Kept for backwards compatibility with old filter components (DrillDownFilters, FilterChip)
export interface DrillDownFilters {
  search: string;
  journeyIds: string[];
  statuses: PlanetStatus[];
  performances: string[];
  timeframe: '7d' | '30d' | 'all';
}

export const DEFAULT_FILTERS: DrillDownFilters = {
  search: '',
  journeyIds: [],
  statuses: [],
  performances: [],
  timeframe: 'all',
};
