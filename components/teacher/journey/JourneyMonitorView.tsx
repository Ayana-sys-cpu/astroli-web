'use client';

import { useCallback, useEffect, useState } from 'react';
import MissionStatusBar from './MissionStatusBar';
import ClassPulse from './ClassPulse';
import AttentionCard, { AttentionStudent } from './AttentionCard';
import AllStudentsPanel from './AllStudentsPanel';

interface MonitorData {
  activeMission: { id: string; question: string; missionOrder: number } | null;
  presenceCount: number;
  totalStudents: number;
  attentionStudents: AttentionStudent[];
  allStudents: { studentId: string; name: string; statusLine: string }[];
}

interface JourneyMonitorViewProps {
  journeyId: string;
  nextMission: { id: string; order: number; title: string } | null;
}

export default function JourneyMonitorView({ journeyId, nextMission }: JourneyMonitorViewProps) {
  const [data, setData] = useState<MonitorData | null>(null);
  const [activating, setActivating] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/teacher/journey/${journeyId}/monitor`);
      if (!res.ok) return;
      const json: MonitorData = await res.json();
      setData(json);
      setLastFetchedAt(new Date());
    } catch {
      // silently ignore network errors
    }
  }, [journeyId]);

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(fetchData, 30_000);
    // tick every 10s so the "updated X sec ago" label stays fresh
    const tickInterval = setInterval(() => setTick(t => t + 1), 10_000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(tickInterval);
    };
  }, [fetchData]);

  async function handleActivate() {
    if (!nextMission || activating) return;
    setActivating(true);
    try {
      await fetch('/api/teacher/missions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: nextMission.id, state: 'active' }),
      });
      await fetchData();
    } finally {
      setActivating(false);
    }
  }

  async function handleAcknowledge(studentId: string) {
    if (!data) return;

    // optimistic remove
    setData(prev =>
      prev
        ? { ...prev, attentionStudents: prev.attentionStudents.filter(s => s.studentId !== studentId) }
        : prev,
    );

    const student = data.attentionStudents.find(s => s.studentId === studentId);
    if (!student) return;

    try {
      await fetch('/api/teacher/signal-acknowledgements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          journeyId,
          signalType: student.signalType,
          status: 'done',
        }),
      });
    } catch {
      // silently ignore — optimistic update already applied
    }
  }

  if (data === null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: 'rgba(26,26,46,0.3)',
          fontSize: 13,
          fontFamily: 'var(--font-space-mono)',
          letterSpacing: '0.08em',
        }}
      >
        Loading session…
      </div>
    );
  }

  const totalStudents = data.totalStudents ?? data.allStudents.length;
  const isActive = !!data.activeMission;

  // Mission to show in MissionStatusBar — active mission takes precedence
  const missionForBar = data.activeMission
    ? { id: data.activeMission.id, order: data.activeMission.missionOrder, title: data.activeMission.question }
    : nextMission
      ? { id: nextMission.id, order: nextMission.order, title: nextMission.title }
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Zone 1 — Mission Status */}
      {missionForBar && (
        <MissionStatusBar
          mission={missionForBar}
          isActive={isActive}
          onActivate={handleActivate}
          activating={activating}
        />
      )}

      {/* Zone 2 — Class Pulse */}
      {isActive && totalStudents > 0 && (
        <ClassPulse
          activeCount={data.presenceCount}
          totalCount={totalStudents}
          attentionCount={data.attentionStudents.length}
        />
      )}

      {/* Zone 3 — Needs Attention (always visible — spec: monitoring works even without activation) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <p
            className="font-space font-bold"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              color: data.attentionStudents.length > 0 ? 'rgba(220,38,38,0.75)' : 'rgba(26,26,46,0.6)',
            }}
          >
            NEEDS ATTENTION
          </p>
          {lastFetchedAt && (
            <span className="font-inter" style={{ fontSize: 11, color: 'rgba(26,26,46,0.3)' }}>
              updated {Math.floor((Date.now() - lastFetchedAt.getTime()) / 1000)}s ago
            </span>
          )}
        </div>
        {data.attentionStudents.length === 0 ? (
          <p
            className="font-inter"
            style={{ fontSize: 14, color: 'rgba(26,26,46,0.45)' }}
          >
            ✅ Everyone is on track right now.
          </p>
        ) : (
          data.attentionStudents.map(student => (
            <AttentionCard
              key={student.studentId}
              student={student}
              onAcknowledge={handleAcknowledge}
            />
          ))
        )}
      </div>

      {/* Zone 4 — All Students */}
      {totalStudents > 0 && (
        <AllStudentsPanel students={data.allStudents} />
      )}
    </div>
  );
}
