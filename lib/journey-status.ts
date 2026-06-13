type MissionState = 'locked' | 'voting' | 'pending_start' | 'active' | 'completed' | 'skipped';
export type JourneyStatus = 'live' | 'voting' | 'pending' | 'done' | 'idle';

interface MissionLike { state: MissionState; }

export function deriveJourneyStatus(
  missions: MissionLike[],
  hasOpenVoteSession: boolean,
): JourneyStatus {
  if (missions.some(m => m.state === 'active')) return 'live';
  if (hasOpenVoteSession || missions.some(m => m.state === 'voting')) return 'voting';
  if (missions.some(m => m.state === 'pending_start')) return 'pending';
  if (missions.length > 0 && missions.every(m => m.state === 'completed' || m.state === 'skipped')) return 'done';
  return 'idle';
}
