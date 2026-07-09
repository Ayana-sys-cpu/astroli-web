'use client';

import { useState } from 'react';
import type { DrillDownResponse, SubjectSummary } from '@/lib/drill-down-types';

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  not_started: 'Not started',
  pending_activation: 'Locked',
};

const MISSION_STATE_LABEL: Record<string, string> = {
  completed: 'Completed',
  active: 'In progress',
  locked: 'Locked',
};

function InsightBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(139,0,255,0.08)', border: '1px solid rgba(139,0,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12,
      }}>
        🤖
      </div>
      <div style={{
        background: 'rgba(139,0,255,0.04)', border: '1px solid rgba(139,0,255,0.1)',
        borderRadius: '0 12px 12px 12px', padding: '10px 14px', flex: 1,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(26,26,46,0.65)', fontStyle: 'italic', lineHeight: 1.55 }}>
          {text}
        </p>
      </div>
    </div>
  );
}

function EvidenceBubble({ text, initials }: { text: string; initials: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexDirection: 'row-reverse' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(26,26,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: 'rgba(26,26,46,0.5)',
      }}>
        {initials}
      </div>
      <div style={{
        background: '#fff', border: '1px solid rgba(26,26,46,0.1)',
        borderRadius: '12px 0 12px 12px', padding: '10px 14px', flex: 1,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: '#1a1a2e', lineHeight: 1.55 }}>{text}</p>
      </div>
    </div>
  );
}

function SubjectGoals({ subject, initials }: { subject: SubjectSummary; initials: string }) {
  if (subject.goals.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(26,26,46,0.5)', margin: '0 0 8px' }}>
        {subject.planetTitle}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {subject.goals.map(goal => (
          <div key={goal.id} style={{
            background: '#fff', border: '1px solid rgba(26,26,46,0.07)', borderRadius: 12,
            padding: '14px 16px', boxShadow: '0 1px 4px rgba(26,26,46,0.06)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{goal.displayTitle}</p>
            {goal.insightText && <InsightBubble text={goal.insightText} />}
            {goal.conversationEvidence && <EvidenceBubble text={goal.conversationEvidence} initials={initials} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionRow({
  missionId, title, state, subjects, initials, expanded, onToggle,
}: {
  missionId: string; title: string; state: string; subjects: SubjectSummary[];
  initials: string; expanded: boolean; onToggle: () => void;
}) {
  const goalCount = subjects.reduce((n, s) => n + s.teachingGoalCount, 0);
  const canExpand = state !== 'locked' && goalCount > 0;

  return (
    <div style={{ borderBottom: '1px solid rgba(26,26,46,0.06)' }}>
      <div
        onClick={() => canExpand && onToggle()}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px',
          cursor: canExpand ? 'pointer' : 'default',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 14, fontWeight: 600,
            color: state === 'locked' ? 'rgba(26,26,46,0.35)' : '#1a1a2e',
          }}>
            {title}
          </p>
          {goalCount > 0 && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(26,26,46,0.4)' }}>
              {goalCount} {goalCount === 1 ? 'topic' : 'topics'} explored
            </p>
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
          background: state === 'completed' ? 'rgba(99,153,34,0.12)' : state === 'active' ? 'rgba(139,0,255,0.1)' : 'rgba(26,26,46,0.06)',
          color: state === 'completed' ? '#3B6D11' : state === 'active' ? '#8B00FF' : 'rgba(26,26,46,0.4)',
          whiteSpace: 'nowrap',
        }}>
          {MISSION_STATE_LABEL[state] ?? state}
        </span>
        {canExpand && (
          <span style={{ fontSize: 12, color: 'rgba(139,0,255,0.5)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            ▾
          </span>
        )}
      </div>
      {expanded && canExpand && (
        <div style={{ padding: '4px 4px 16px' }}>
          {subjects.filter(s => s.missionId === missionId && s.goals.length > 0).map(s => (
            <SubjectGoals key={s.planetId} subject={s} initials={initials} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChildProgress({ childName }: { childName: string | null }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expandedMission, setExpandedMission] = useState<string | null>(null);

  const displayName = childName ?? 'your child';

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (data || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/parent/dashboard/progress');
      if (!res.ok) { setError(true); return; }
      setData(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const journey = data?.journeys[0];
  const missions = journey ? data!.missionsByJourney[journey.id] ?? [] : [];

  return (
    <div>
      <button
        onClick={handleOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
          Review {displayName}&apos;s progress
        </span>
        <span style={{ fontSize: 12, color: 'rgba(139,0,255,0.6)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {loading && (
            <p style={{ fontSize: 12, color: 'rgba(26,26,46,0.4)' }}>Loading progress…</p>
          )}
          {error && (
            <p style={{ fontSize: 12, color: 'rgba(226,75,74,0.9)' }}>
              Couldn&apos;t load progress right now. Try again shortly.
            </p>
          )}
          {!loading && !error && missions.length === 0 && (
            <p style={{ fontSize: 12, color: 'rgba(26,26,46,0.4)' }}>
              Nothing to show yet — {displayName} hasn&apos;t started a mission.
            </p>
          )}
          {!loading && !error && missions.length > 0 && (
            <div>
              {missions.map(m => (
                <MissionRow
                  key={m.id}
                  missionId={m.id}
                  title={m.title}
                  state={m.state}
                  subjects={data!.subjects}
                  initials={data!.student.initials}
                  expanded={expandedMission === m.id}
                  onToggle={() => setExpandedMission(prev => prev === m.id ? null : m.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
