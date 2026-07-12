import { deriveJourneyStatus, type JourneyStatus } from './journey-status';

export type MissionSummary = {
  id:    string;
  title: string;
  state: 'locked' | 'active' | 'completed' | 'skipped';
  order: number;
};

export interface HomeJourney {
  classId:                 string;
  className:               string;
  teacherName:             string | null;
  status:                  JourneyStatus;
  language?:               'en' | 'he';
  isFamilyClass?:          boolean;
  activeMissionId?:        string;
  missionTitle?:           string;
  planetsExplored?:        number;
  planetsTotal?:           number;
  studentMissionCompleted?: boolean;
  voteSessionId?:          string | null;
  voteEndsAt?:             string | null;
  completedMissionsCount?: number;
  missions?:               MissionSummary[];
}

interface MissionStateLike {
  state: 'locked' | 'voting' | 'pending_start' | 'active' | 'completed' | 'skipped';
}

interface ActiveMissionInfo {
  id:              string;
  title:           string;
  planetsTotal:    number;
  planetsExplored: number;
}

interface OpenVoteSessionInfo {
  id:     string;
  endsAt: string | null;
}

export interface BuildHomeJourneyInput {
  classId:                 string;
  className:               string;
  teacherName:             string | null;
  language?:               'en' | 'he';
  isFamilyClass?:          boolean;
  missionStates:           MissionStateLike[];
  openVoteSession:         OpenVoteSessionInfo | null;
  activeMission:           ActiveMissionInfo | null;
  completedMissionsCount:  number;
  allMissions:             MissionSummary[];
}

/**
 * Derives one home-screen card's data for a single class. Status comes from
 * the same deriveJourneyStatus() the teacher dashboard already uses — this
 * just runs it per class and attaches the state-specific payload the card
 * needs to render (see docs/superpowers/specs/2026-06-16-student-multi-journey-home-design.md).
 */
export function buildHomeJourney(input: BuildHomeJourneyInput): HomeJourney {
  const status = deriveJourneyStatus(input.missionStates, Boolean(input.openVoteSession));
  const base: HomeJourney = {
    classId:        input.classId,
    className:      input.className,
    teacherName:    input.teacherName,
    language:       input.language,
    isFamilyClass:  input.isFamilyClass || undefined,
    status,
    missions:       input.allMissions,
  };

  switch (status) {
    case 'live': {
      if (!input.activeMission) return base;
      const allExplored =
        (input.activeMission.planetsTotal ?? 0) > 0 &&
        (input.activeMission.planetsExplored ?? 0) >= (input.activeMission.planetsTotal ?? 0);
      return {
        ...base,
        activeMissionId:         input.activeMission.id,
        missionTitle:            input.activeMission.title,
        planetsExplored:         input.activeMission.planetsExplored,
        planetsTotal:            input.activeMission.planetsTotal,
        studentMissionCompleted: allExplored || undefined,
      };
    }
    case 'voting':
      return {
        ...base,
        voteSessionId: input.openVoteSession?.id ?? null,
        voteEndsAt:    input.openVoteSession?.endsAt ?? null,
      };
    case 'pending':
      return { ...base, voteSessionId: null, voteEndsAt: null };
    case 'done':
      return { ...base, completedMissionsCount: input.completedMissionsCount };
    default:
      return base;
  }
}
