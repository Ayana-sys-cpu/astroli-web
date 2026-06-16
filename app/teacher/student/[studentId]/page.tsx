'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DrillDownHeader from '@/components/teacher/drill-down/DrillDownHeader';
import ThisWeekView from '@/components/teacher/drill-down/ThisWeekView';
import AllTimeView from '@/components/teacher/drill-down/AllTimeView';
import CrossJourneyInsights from '@/components/teacher/drill-down/CrossJourneyInsights';
import type { DrillDownResponse } from '@/lib/drill-down-types';

type MainTab = 'this-week' | 'all-time';

export default function StudentDrillDownPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [data, setData] = useState<DrillDownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('this-week');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/teacher/students/${studentId}/drill-down`, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: DrillDownResponse) => {
        setData(d);
        if (d.journeys.length > 0) setSelectedJourneyId(d.journeys[0].id);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') { setError(e.message); setLoading(false); }
      });
    return () => ctrl.abort();
  }, [studentId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%',
          border: '2px solid rgba(139,0,255,0.2)', borderTopColor: '#8B00FF',
          animation: 'spin 0.8s linear infinite', display: 'inline-block',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ fontSize: 13, color: '#ef4444' }}>{error ?? 'Student not found.'}</p>
      </div>
    );
  }

  const firstName = data.student.name.split(' ')[0] || data.student.name;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(248,248,252,0.8)' }}>
      <style>{`
        .dd-btn:focus-visible { outline: 2px solid #8B00FF !important; outline-offset: 2px; }
      `}</style>

      {/* Student identity header */}
      <DrillDownHeader student={data.student} />

      {/* Main tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid rgba(26,26,46,0.08)',
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        {(['this-week', 'all-time'] as MainTab[]).map((tab) => (
          <button
            key={tab}
            className="dd-btn"
            onClick={() => setMainTab(tab)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: mainTab === tab ? 700 : 500,
              color: mainTab === tab ? '#1a1a2e' : 'rgba(26,26,46,0.45)',
              cursor: 'pointer',
              borderBottom: mainTab === tab ? '2px solid #8B00FF' : '2px solid transparent',
              transition: 'all 0.15s',
              position: 'relative',
              bottom: -1,
            }}
          >
            {tab === 'this-week' ? 'This week' : 'All time'}
          </button>
        ))}
      </div>

      {/* Journey sub-tabs — always rendered so layout is stable regardless of journey count */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 20px',
        borderBottom: '1px solid rgba(26,26,46,0.06)',
        background: 'rgba(255,255,255,0.5)',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {data.journeys.length === 1 ? (
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#8B00FF',
            padding: '5px 14px',
            borderRadius: 20,
            border: '1px solid rgba(139,0,255,0.3)',
            background: 'rgba(139,0,255,0.08)',
            whiteSpace: 'nowrap',
          }}>
            {data.journeys[0].title}
          </span>
        ) : (
          data.journeys.map((journey) => {
            const active = selectedJourneyId === journey.id;
            return (
              <button
                key={journey.id}
                className="dd-btn"
                onClick={() => setSelectedJourneyId(journey.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: active ? '1px solid rgba(139,0,255,0.3)' : '1px solid rgba(26,26,46,0.1)',
                  background: active ? 'rgba(139,0,255,0.08)' : 'rgba(255,255,255,0.7)',
                  color: active ? '#8B00FF' : 'rgba(26,26,46,0.55)',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  minHeight: 36,
                }}
              >
                {journey.title}
              </button>
            );
          })
        )}
      </div>

      {/* Main content */}
      {selectedJourneyId && (
        mainTab === 'this-week' ? (
          <ThisWeekView
            data={data}
            selectedJourneyId={selectedJourneyId}
            onSwitchToAllTime={() => setMainTab('all-time')}
          />
        ) : (
          <AllTimeView data={data} selectedJourneyId={selectedJourneyId} />
        )
      )}

      {/* Cross-journey footer */}
      <CrossJourneyInsights data={data} studentFirstName={firstName} />
    </div>
  );
}
