'use client';
import SubjectRow from './SubjectRow';
import SignalBanner from './SignalBanner';
import type { DrillDownResponse } from '@/lib/drill-down-types';

interface Props {
  data: DrillDownResponse;
  selectedJourneyId: string;
}

export default function ThisWeekView({ data, selectedJourneyId }: Props) {
  const activeMissionId = data.activeMissionByJourney[selectedJourneyId] ?? '';
  const signal = data.signalByJourney[selectedJourneyId] ?? null;
  const selectedJourney = data.journeys.find((j) => j.id === selectedJourneyId);

  const activeSubjects = activeMissionId
    ? data.subjects.filter(
        (s) => s.journeyId === selectedJourneyId && s.missionId === activeMissionId,
      )
    : [];

  const firstName = data.student.name.split(' ')[0] || data.student.name;

  return (
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
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(26,26,46,0.4)', margin: 0 }}>
            {activeMissionId
              ? 'No subjects in the active mission yet.'
              : 'No active mission in this journey right now.'}
          </p>
        </div>
      ) : (
        <div>
          <div style={{ padding: '12px 20px 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Active mission · {activeSubjects[0]?.missionTitle}
            </span>
          </div>
          {activeSubjects.map((subject) => (
            <SubjectRow
              key={subject.planetId}
              subject={subject}
              mode="this-week"
              studentInitials={data.student.initials}
            />
          ))}
        </div>
      )}
    </div>
  );
}
