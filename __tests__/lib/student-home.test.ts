import { describe, it, expect } from 'vitest';
import { buildHomeJourney } from '@/lib/student-home';

const base = {
  classId:     'class-1',
  className:   'World History',
  teacherName: 'Mr. Lee',
};

describe('buildHomeJourney', () => {
  it('returns a live journey with active mission + planet progress', () => {
    const result = buildHomeJourney({
      ...base,
      missionStates: [{ state: 'active' }, { state: 'locked' }],
      openVoteSession: null,
      activeMission: { id: 'mission-1', title: 'The Schism Mission', planetsTotal: 6, planetsExplored: 3 },
      completedMissionsCount: 0,
    });

    expect(result).toEqual({
      classId: 'class-1',
      className: 'World History',
      teacherName: 'Mr. Lee',
      status: 'live',
      activeMissionId: 'mission-1',
      missionTitle: 'The Schism Mission',
      planetsExplored: 3,
      planetsTotal: 6,
    });
  });

  it('returns a voting journey with the open vote session info', () => {
    const result = buildHomeJourney({
      ...base,
      missionStates: [{ state: 'voting' }, { state: 'locked' }],
      openVoteSession: { id: 'session-1', endsAt: '2026-07-01T00:00:00.000Z' },
      activeMission: null,
      completedMissionsCount: 0,
    });

    expect(result).toEqual({
      classId: 'class-1',
      className: 'World History',
      teacherName: 'Mr. Lee',
      status: 'voting',
      voteSessionId: 'session-1',
      voteEndsAt: '2026-07-01T00:00:00.000Z',
    });
  });

  it('returns a pending (awaiting launch) journey with no vote session payload', () => {
    const result = buildHomeJourney({
      ...base,
      missionStates: [{ state: 'pending_start' }, { state: 'skipped' }],
      openVoteSession: null,
      activeMission: null,
      completedMissionsCount: 0,
    });

    expect(result).toEqual({
      classId: 'class-1',
      className: 'World History',
      teacherName: 'Mr. Lee',
      status: 'pending',
      voteSessionId: null,
      voteEndsAt: null,
    });
  });

  it('returns a done journey with the completed missions count', () => {
    const result = buildHomeJourney({
      ...base,
      missionStates: [{ state: 'completed' }, { state: 'completed' }, { state: 'skipped' }],
      openVoteSession: null,
      activeMission: null,
      completedMissionsCount: 2,
    });

    expect(result).toEqual({
      classId: 'class-1',
      className: 'World History',
      teacherName: 'Mr. Lee',
      status: 'done',
      completedMissionsCount: 2,
    });
  });

  it('returns an idle journey with no extra fields when there is nothing to do', () => {
    const result = buildHomeJourney({
      ...base,
      missionStates: [{ state: 'locked' }],
      openVoteSession: null,
      activeMission: null,
      completedMissionsCount: 0,
    });

    expect(result).toEqual({
      classId: 'class-1',
      className: 'World History',
      teacherName: 'Mr. Lee',
      status: 'idle',
    });
  });

  it('handles a null teacherName', () => {
    const result = buildHomeJourney({
      ...base,
      teacherName: null,
      missionStates: [],
      openVoteSession: null,
      activeMission: null,
      completedMissionsCount: 0,
    });

    expect(result.teacherName).toBeNull();
    expect(result.status).toBe('idle');
  });
});
