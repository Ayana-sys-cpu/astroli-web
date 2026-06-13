// src/astroli-web/lib/drill-down-types.ts

import type { SignalType } from '@/lib/signals';

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

export type PlanetStatus = 'not_started' | 'in_progress' | 'completed' | 'pending_activation';

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

const VALID_PERFORMANCE_TYPES = new Set<string>([
  'explaining', 'mustering_evidence', 'finding_examples', 'generalizing',
  'applying_concepts', 'analogizing', 'representing_in_new_ways',
  'considering_alternatives', 'actionable_extrapolation', 'grace_completion',
]);

export function toPerformanceType(value: string | null | undefined): PerformanceType | null {
  if (!value) return null;
  return VALID_PERFORMANCE_TYPES.has(value) ? (value as PerformanceType) : null;
}

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
  missionId: string;
  missionTitle: string;
  missionOrder: number;
  journeyId: string;
  journeyTitle: string;
  status: PlanetStatus;
  performanceType: PerformanceType | null;
  assessedAt: string | null;
  goals: GoalSummary[];
  teachingGoalCount: number;
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
  peakPerformanceType: PerformanceType | null;
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
