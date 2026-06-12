export type AttentionSignalType = 'grace_completion' | 'stuck' | 'non_engagement';

const SIGNAL_PRIORITY: Record<AttentionSignalType, number> = {
  grace_completion: 0,
  stuck: 1,
  non_engagement: 2,
};

export function buildContextLine(
  signalType: AttentionSignalType,
  planetName: string | null,
  minutesOnPlanet: number | null,
): string {
  switch (signalType) {
    case 'grace_completion':
      return planetName
        ? `Completed ${planetName} without demonstrating understanding`
        : 'Completed a planet without demonstrating understanding';
    case 'stuck':
      if (planetName && minutesOnPlanet !== null) {
        return `On ${planetName} for ${minutesOnPlanet} min, no breakthrough yet`;
      }
      if (minutesOnPlanet !== null) {
        return `Has been working for ${minutesOnPlanet} min without a breakthrough`;
      }
      return planetName
        ? `Has been on ${planetName} for a while with no breakthrough`
        : 'Has been working without a breakthrough';
    case 'non_engagement':
      return 'No activity since class started';
  }
}

export function orderAttentionStudents<T extends { signalType: AttentionSignalType; signalCreatedAt: string }>(
  students: T[],
): T[] {
  return [...students].sort((a, b) => {
    const pDiff = SIGNAL_PRIORITY[a.signalType] - SIGNAL_PRIORITY[b.signalType];
    if (pDiff !== 0) return pDiff;
    return new Date(b.signalCreatedAt).getTime() - new Date(a.signalCreatedAt).getTime();
  });
}

export function buildStatusLine(
  isActiveNow: boolean,
  currentPlanetName: string | null,
  isOffline: boolean,
): string {
  if (isOffline && !isActiveNow) return 'Offline';
  if (isActiveNow && currentPlanetName) return `Actively on ${currentPlanetName}`;
  if (isActiveNow) return 'Actively exploring';
  if (currentPlanetName) return `Completed ${currentPlanetName}`;
  return 'Not yet started';
}
