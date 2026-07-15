'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DrillDownHeader from '@/components/teacher/drill-down/DrillDownHeader';
import AllTimeView from '@/components/teacher/drill-down/AllTimeView';
import CrossJourneyInsights from '@/components/teacher/drill-down/CrossJourneyInsights';
import ThisWeekView from '@/components/teacher/drill-down/ThisWeekView';
import SetupChecklist, { type SetupStep } from './SetupChecklist';
import InvitePendingState from './InvitePendingState';
import type { DrillDownResponse } from '@/lib/drill-down-types';

type MainTab = 'this-week' | 'all-time';

type SetupData = {
  child: { id: string; name: string | null } | null;
  familyClass: { id: string; title: string; journeyId: string } | null;
  pendingInvite: { childEmail: string; createdAt: string; expiresAt: string } | null;
  setupState: { step: SetupStep; nextActionLabel: string | null; nextActionHref: string | null };
};

export default function ParentDashboardPage() {
  const router = useRouter();
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [progressData, setProgressData] = useState<DrillDownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('this-week');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');

  useEffect(() => {
    const ctrl = new AbortController();

    fetch('/api/parent/dashboard', { signal: ctrl.signal })
      .then((r) => {
        if (r.status === 401 || r.status === 403) { router.replace('/'); return null; }
        return r.json() as Promise<SetupData>;
      })
      .then(async (setup) => {
        if (!setup) return;
        setSetupData(setup);

        // Fetch progress data whenever there is a family class — even if the
        // child hasn't accepted the invite yet (drill-down returns 403 in that
        // case, which we handle gracefully by showing an empty state rather
        // than redirecting).
        if (setup.familyClass) {
          const pr = await fetch('/api/parent/student/drill-down', { signal: ctrl.signal });
          if (pr.status === 401) { router.replace('/'); return; }
          if (pr.status !== 403) {
            const pd: DrillDownResponse = await pr.json();
            setProgressData(pd);
            if (pd.journeys.length > 0) setSelectedJourneyId(pd.journeys[0].id);
          }
          // 403 = no linked child yet — stay on empty state, do not redirect
        }
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

  if (!setupData) return null;

  const { setupState, child, familyClass, pendingInvite } = setupData;

  // No family class yet → parent hasn't completed onboarding; show the checklist.
  if (!familyClass) {
    return (
      <div style={{ padding: '40px 32px' }}>
        <div className="glass-panel" style={{ maxWidth: 480, padding: '24px 28px' }}>
          <p style={{
            fontSize: 10, letterSpacing: '0.08em', fontFamily: 'var(--font-space)', fontWeight: 700,
            textTransform: 'uppercase', color: 'rgba(26,26,46,0.4)', marginBottom: 16,
          }}>
            Getting started
          </p>
          <SetupChecklist
            step={setupState.step}
            nextActionLabel={setupState.nextActionLabel}
            nextActionHref={setupState.nextActionHref}
            childName={child?.name ?? null}
          />
        </div>
      </div>
    );
  }

  // Family class exists but child hasn't accepted the invite yet — show the
  // full dashboard shell with an empty state in the content area.
  if (!progressData) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(248,248,252,0.8)' }}>
        {/* Journey pill row */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '16px 20px',
          borderBottom: '1px solid rgba(26,26,46,0.06)',
          background: 'rgba(255,255,255,0.5)', flexShrink: 0,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#8B00FF',
            padding: '5px 14px', borderRadius: 20,
            border: '1px solid rgba(139,0,255,0.3)',
            background: 'rgba(139,0,255,0.08)', whiteSpace: 'nowrap',
          }}>
            {familyClass.title}
          </span>
        </div>

        <InvitePendingState childName={child?.name ?? null} pendingInvite={pendingInvite} />
      </div>
    );
  }

  const data = progressData;
  const firstName = data.student.name.split(' ')[0] || data.student.name;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(248,248,252,0.8)' }}>
      <style>{`
        .dd-btn:focus-visible { outline: 2px solid #8B00FF !important; outline-offset: 2px; }
      `}</style>

      <DrillDownHeader student={data.student} hideBackButton />

      {/* Main tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 20px',
        borderBottom: '1px solid rgba(26,26,46,0.08)',
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        {(['this-week', 'all-time'] as MainTab[]).map((tab) => (
          <button
            key={tab}
            className="dd-btn"
            onClick={() => setMainTab(tab)}
            style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              fontSize: 13,
              fontWeight: mainTab === tab ? 700 : 500,
              color: mainTab === tab ? '#1a1a2e' : 'rgba(26,26,46,0.45)',
              cursor: 'pointer',
              borderBottom: mainTab === tab ? '2px solid #8B00FF' : '2px solid transparent',
              transition: 'all 0.15s', position: 'relative', bottom: -1,
            }}
          >
            {tab === 'this-week' ? 'This week' : 'All time'}
          </button>
        ))}
      </div>

      {/* Journey pills */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
        borderBottom: '1px solid rgba(26,26,46,0.06)',
        background: 'rgba(255,255,255,0.5)',
        flexShrink: 0, overflowX: 'auto',
      }}>
        {data.journeys.length === 1 ? (
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#8B00FF',
            padding: '5px 14px', borderRadius: 20,
            border: '1px solid rgba(139,0,255,0.3)',
            background: 'rgba(139,0,255,0.08)', whiteSpace: 'nowrap',
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
                  padding: '8px 16px', borderRadius: 20,
                  border: active ? '1px solid rgba(139,0,255,0.3)' : '1px solid rgba(26,26,46,0.1)',
                  background: active ? 'rgba(139,0,255,0.08)' : 'rgba(255,255,255,0.7)',
                  color: active ? '#8B00FF' : 'rgba(26,26,46,0.55)',
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s', minHeight: 36,
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

      <CrossJourneyInsights data={data} studentFirstName={firstName} />
    </div>
  );
}
