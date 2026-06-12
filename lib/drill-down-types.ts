// src/astroli-web/lib/drill-down-types.ts

export type PerkinsType =
  | 'explaining'
  | 'mustering_evidence'
  | 'finding_examples'
  | 'generalizing'
  | 'applying_concepts'
  | 'analogizing'
  | 'representing_in_new_ways'
  | 'considering_alternatives'
  | 'actionable_extrapolation';

export type PerformanceType = PerkinsType | 'grace_completion';

export type PlanetStatus = 'not_started' | 'in_progress' | 'completed';

// Display label for each Perkins type (shown in badge and GoalCard)
export const PERKINS_LABELS: Record<PerkinsType, string> = {
  explaining: 'Explaining',
  mustering_evidence: 'Mustering Evidence',
  finding_examples: 'Finding Examples',
  generalizing: 'Generalizing',
  applying_concepts: 'Applying Concepts',
  analogizing: 'Analogizing',
  representing_in_new_ways: 'Representing in New Ways',
  considering_alternatives: 'Considering Alternatives',
  actionable_extrapolation: 'Actionable Extrapolation',
};

export function performanceLabel(type: PerformanceType | null): string {
  if (!type) return 'Not started';
  if (type === 'grace_completion') return 'Grace Completion';
  return PERKINS_LABELS[type] ?? type;
}

export interface GoalSummary {
  id: string;
  goalTitle: string;
  performanceType: PerformanceType | null;
  botQuestion: string;
  studentAnswer: string;
}

export interface SubjectSummary {
  planetId: string;
  planetTitle: string;
  missionTitle: string;
  missionOrder: number;
  journeyId: string;
  journeyTitle: string;
  status: PlanetStatus;
  performanceType: PerformanceType | null;
  assessedAt: string | null;
  goals: GoalSummary[];
}

export interface DrillDownStudent {
  id: string;
  name: string;
  initials: string;
  journeyEnrollments: { journeyId: string; title: string }[];
}

export interface DrillDownResponse {
  student: DrillDownStudent;
  subjects: SubjectSummary[];
  journeys: { id: string; title: string }[];
}

// Filter state used by the page and DrillDownFilters component
export interface DrillDownFilters {
  search: string;
  journeyIds: string[];      // empty = all
  statuses: PlanetStatus[];  // empty = all
  performances: string[];    // empty = all; values: PerformanceType | 'not_assessed'
  timeframe: '7d' | '30d' | '90d' | 'all';
}

export const DEFAULT_FILTERS: DrillDownFilters = {
  search: '',
  journeyIds: [],
  statuses: [],
  performances: [],
  timeframe: '7d',
};
