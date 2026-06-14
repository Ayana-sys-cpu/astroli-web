'use client';
import { useMemo } from 'react';
import SubjectRow from './SubjectRow';
import PerformanceBadge from './PerformanceBadge';
import type { DrillDownResponse, MissionMeta, PerformanceType } from '@/lib/drill-down-types';

const PERKINS_RANK: Record<string, number> = {
  grace_completion: 0,
  explaining: 1,
  mustering_evidence: 2,
  finding_examples: 3,
  generalizing: 4,
  applying_concepts: 5,
  analogizing: 6,
  representing_in_new_ways: 7,
  considering_alternatives: 8,
  actionable_extrapolation: 9,
};

function missionStateLabel(state: string): { label: string; color: string; bg: string } {
  if (state === 'completed') return { label: 'completed', color: '#15803d', bg: 'rgba(21,128,61,0.1)' };
  if (state === 'active') return { label: 'active', color: '#166534', bg: 'rgba(74,222,128,0.15)' };
  return { label: 'upcoming', color: 'rgba(26,26,46,0.35)', bg: 'rgba(26,26,46,0.06)' };
}

interface Props {
  data: DrillDownResponse;
  selectedJourneyId: string;
}

export default function AllTimeView({ data, selectedJourneyId }: Props) {
  const missions: MissionMeta[] = data.missionsByJourney[selectedJourneyId] ?? [];

  const journeySubjects = useMemo(
    () => data.subjects.filter((s) => s.journeyId === selectedJourneyId),
    [data.subjects, selectedJourneyId],
  );

  const subjectsByMission = useMemo(() => {
    const map = new Map<string, typeof journeySubjects>();
    for (const s of journeySubjects) {
      if (!map.has(s.missionId)) map.set(s.missionId, []);
      map.get(s.missionId)!.push(s);
    }
    return map;
  }, [journeySubjects]);

  const overview = useMemo(() => {
    const completedCount = missions.filter((m) => m.state === 'completed').length;
    const activeCount = missions.filter((m) => m.state === 'active').length;
    const studiedCount = journeySubjects.filter(
      (s) => s.status !== 'not_started' && s.status !== 'pending_activation',
    ).length;

    let peakType: PerformanceType | null = null;
    let peakRank = -1;
    for (const s of journeySubjects) {
      if (s.performanceType) {
        const rank = PERKINS_RANK[s.performanceType] ?? -1;
        if (rank > peakRank) { peakRank = rank; peakType = s.performanceType; }
      }
    }

    return { completedCount, activeCount, studiedCount, peakType };
  }, [missions, journeySubjects]);

  function scrollToMission(missionId: string) {
    document.getElementById(`mission-section-${missionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Left sidebar */}
      <div style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid rgba(26,26,46,0.07)',
        overflowY: 'auto',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        background: 'rgba(255,255,255,0.4)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, padding: '0 4px' }}>
          All Missions
        </div>

        {missions.map((mission) => {
          const { label, color, bg } = missionStateLabel(mission.state);
          return (
            <button
              key={mission.id}
              onClick={() => scrollToMission(mission.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,0,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: '#1a1a2e', lineHeight: 1.4, flex: 1, textAlign: 'left' }}>
                {mission.title}
              </span>
              <span style={{ fontSize: 10, fontWeight: 500, color, background: bg, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {label}
              </span>
            </button>
          );
        })}

        {/* Overview stats */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(26,26,46,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, padding: '0 4px' }}>
            Overview
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
            {overview.completedCount > 0 && (
              <div style={{ fontSize: 12, color: 'rgba(26,26,46,0.7)' }}>
                <strong style={{ color: '#1a1a2e' }}>{overview.completedCount}</strong> missions completed
              </div>
            )}
            {overview.activeCount > 0 && (
              <div style={{ fontSize: 12, color: 'rgba(26,26,46,0.7)' }}>
                <strong style={{ color: '#1a1a2e' }}>{overview.activeCount}</strong> active {overview.activeCount === 1 ? 'mission' : 'missions'}
              </div>
            )}
            {overview.peakType && (
              <div style={{ fontSize: 12, color: 'rgba(26,26,46,0.7)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Peak level reached</span>
                <PerformanceBadge performanceType={overview.peakType} size="sm" />
              </div>
            )}
            {overview.studiedCount > 0 && (
              <div style={{ fontSize: 12, color: 'rgba(26,26,46,0.7)' }}>
                <strong style={{ color: '#1a1a2e' }}>{overview.studiedCount}</strong> subjects studied
              </div>
            )}
            {missions.length > 0 && (
              <div style={{ fontSize: 11, color: 'rgba(26,26,46,0.3)', marginTop: 4, lineHeight: 1.4 }}>
                Click any subject to see teaching goal breakdown
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 24px' }}>
        {missions.map((mission) => {
          const missionSubjects = subjectsByMission.get(mission.id) ?? [];
          const { label, color, bg } = missionStateLabel(mission.state);
          return (
            <div key={mission.id} id={`mission-section-${mission.id}`} style={{ paddingTop: 8 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 20px 6px',
                borderBottom: '1px solid rgba(26,26,46,0.06)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                  {mission.title}
                </span>
                <span style={{ fontSize: 11, fontWeight: 500, color, background: bg, padding: '2px 8px', borderRadius: 4 }}>
                  {label}
                </span>
              </div>

              {missionSubjects.length === 0 ? (
                <p style={{ padding: '12px 20px', fontSize: 12, color: 'rgba(26,26,46,0.3)', margin: 0 }}>
                  No subjects in this mission.
                </p>
              ) : (
                missionSubjects.map((subject) => (
                  <SubjectRow
                    key={subject.planetId}
                    subject={subject}
                    mode="all-time"
                    studentInitials={data.student.initials}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
