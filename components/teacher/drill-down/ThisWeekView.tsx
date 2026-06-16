'use client';
import { useState } from 'react';
import SubjectRow from './SubjectRow';
import SignalBanner from './SignalBanner';
import PerformanceBadge from './PerformanceBadge';
import type { DrillDownResponse, PerformanceType } from '@/lib/drill-down-types';

const PERKINS_RANK: Record<string, number> = {
  explaining: 1, mustering_evidence: 2, finding_examples: 3,
  generalizing: 4, applying_concepts: 5, analogizing: 6,
  representing_in_new_ways: 7, considering_alternatives: 8, actionable_extrapolation: 9,
};

interface Props {
  data: DrillDownResponse;
  selectedJourneyId: string;
  onSwitchToAllTime: () => void;
}

export default function ThisWeekView({ data, selectedJourneyId, onSwitchToAllTime }: Props) {
  const [expandedPlanetId, setExpandedPlanetId] = useState<string | null>(null);
  const activeMissionId = data.activeMissionByJourney[selectedJourneyId] ?? '';
  const signal = data.signalByJourney[selectedJourneyId] ?? null;
  const selectedJourney = data.journeys.find((j) => j.id === selectedJourneyId);
  const activeMission = data.missionsByJourney[selectedJourneyId]?.find((m) => m.id === activeMissionId);

  const activeSubjects = activeMissionId
    ? data.subjects.filter(
        (s) => s.journeyId === selectedJourneyId && s.missionId === activeMissionId,
      )
    : [];

  const firstName = data.student.name.split(' ')[0] || data.student.name;

  // Peak Perkins level across all subjects in the active mission (grace_completion excluded from peak)
  const peakPerformance = activeSubjects.reduce<PerformanceType | null>((best, s) => {
    if (!s.performanceType || s.performanceType === 'grace_completion') return best;
    if (!best || best === 'grace_completion') return s.performanceType;
    return (PERKINS_RANK[s.performanceType] ?? 0) > (PERKINS_RANK[best] ?? 0)
      ? s.performanceType
      : best;
  }, null);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* ── Left sidebar ── */}
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
        {/* Section header */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'rgba(26,26,46,0.35)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: 14, padding: '0 4px',
        }}>
          {selectedJourney?.title} · This week
        </div>

        {/* Active mission */}
        {activeMission ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px', marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: 'rgba(26,26,46,0.45)', fontWeight: 500 }}>
              Active mission
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.4 }}>
              {activeMission.title}
            </span>
          </div>
        ) : (
          <div style={{ padding: '0 4px', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'rgba(26,26,46,0.35)', fontStyle: 'italic' }}>
              No active mission
            </span>
          </div>
        )}

        {/* Highest level reached */}
        {peakPerformance && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(26,26,46,0.45)', fontWeight: 500 }}>
              Highest level reached
            </span>
            <PerformanceBadge performanceType={peakPerformance} size="sm" />
          </div>
        )}

        {/* Subjects count */}
        {activeSubjects.length > 0 && (
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(26,26,46,0.08)',
            display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 4px 0',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(26,26,46,0.45)', fontWeight: 500 }}>
              Subjects this mission
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>
              {activeSubjects.length}
            </span>
          </div>
        )}
      </div>

      {/* ── Right content ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {signal && selectedJourney && (
          <div style={{ paddingTop: 12 }}>
            <SignalBanner
              signalType={signal}
              studentFirstName={firstName}
              journeyTitle={selectedJourney.title}
            />
          </div>
        )}

        {activeSubjects.length === 0 ? (
          <div style={{
            padding: '32px 20px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <p style={{ fontSize: 13, color: 'rgba(26,26,46,0.4)', margin: 0 }}>
              {activeMissionId
                ? 'No subjects in the active mission yet.'
                : 'No active mission in this journey right now.'}
            </p>
            <button
              className="dd-btn"
              onClick={onSwitchToAllTime}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#8B00FF',
                background: 'rgba(139,0,255,0.06)',
                border: '1px solid rgba(139,0,255,0.2)',
                borderRadius: 8,
                padding: '7px 16px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,0,255,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(139,0,255,0.06)')}
            >
              View all missions →
            </button>
          </div>
        ) : (
          <div>
            <div style={{ padding: '12px 20px 4px' }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: 'rgba(26,26,46,0.5)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Active mission · {activeSubjects[0]?.missionTitle}
              </span>
            </div>
            {activeSubjects.map((subject) => (
              <SubjectRow
                key={subject.planetId}
                subject={subject}
                mode="this-week"
                studentInitials={data.student.initials}
                isExpanded={expandedPlanetId === subject.planetId}
                onToggle={() => setExpandedPlanetId(
                  expandedPlanetId === subject.planetId ? null : subject.planetId
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
