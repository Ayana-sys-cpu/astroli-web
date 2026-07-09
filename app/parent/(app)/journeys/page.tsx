'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AllTimeView from '@/components/teacher/drill-down/AllTimeView';
import type { DrillDownResponse } from '@/lib/drill-down-types';

export default function ParentJourneysPage() {
  const router = useRouter();
  const [data, setData] = useState<DrillDownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/parent/dashboard/progress', { signal: ctrl.signal })
      .then((r) => {
        if (r.status === 401 || r.status === 403) { router.replace('/'); return null; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DrillDownResponse>;
      })
      .then((d) => {
        if (!d) return;
        setData(d);
        if (d.journeys.length > 0) setSelectedJourneyId(d.journeys[0].id);
      })
      .catch((e: Error) => { if (e.name !== 'AbortError') router.replace('/'); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [router]);

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

  if (!data) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(248,248,252,0.8)' }}>
      <style>{`
        .dd-btn:focus-visible { outline: 2px solid #8B00FF !important; outline-offset: 2px; }
      `}</style>

      {/* Page header */}
      <div style={{
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(26,26,46,0.08)',
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>Journeys</h1>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(26,26,46,0.4)', fontFamily: 'var(--font-space)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {data.student.name}&apos;s missions
          </p>
        </div>

        {/* Journey pill switcher (shown when multiple journeys) */}
        {data.journeys.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.journeys.map((journey) => {
              const active = selectedJourneyId === journey.id;
              return (
                <button
                  key={journey.id}
                  className="dd-btn"
                  onClick={() => setSelectedJourneyId(journey.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 20,
                    border: active ? '1px solid rgba(139,0,255,0.3)' : '1px solid rgba(26,26,46,0.1)',
                    background: active ? 'rgba(139,0,255,0.08)' : 'rgba(255,255,255,0.7)',
                    color: active ? '#8B00FF' : 'rgba(26,26,46,0.55)',
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.15s', minHeight: 32,
                  }}
                >
                  {journey.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mission map */}
      {selectedJourneyId && (
        <AllTimeView data={data} selectedJourneyId={selectedJourneyId} />
      )}
    </div>
  );
}
