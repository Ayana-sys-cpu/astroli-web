'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseSignOut } from '@/lib/session';
import { clearSession } from '@/lib/student-store';
import WeeklySignalCard, { type WeeklySignal } from './WeeklySignalCard';
import SetupChecklist, { type SetupStep } from './SetupChecklist';
import ChildProgress from './ChildProgress';

type DashboardData = {
  child:           { id: string; name: string | null } | null;
  familyClass:     { id: string; title: string; journeyId: string } | null;
  missionProgress: {
    total:              number;
    completed:          number;
    activeMissionId:    string | null;
    activeMissionTitle: string | null;
  } | null;
  botUsage: { used: number; limit: number; resetsAt: string | null };
  setupState: { step: SetupStep; nextActionLabel: string | null; nextActionHref: string | null };
  weeklySignals: WeeklySignal[];
};

export default function ParentDashboardPage() {
  const router = useRouter();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/parent/dashboard')
      .then(r => {
        if (r.status === 401 || r.status === 403) { router.replace('/'); return null; }
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSignOut = async () => {
    clearSession();
    await supabaseSignOut().catch(() => {});
    router.push('/');
  };

  const childName = data?.child?.name ?? null;

  return (
    <div
      data-theme="light"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #EEF2FF 0%, #F5F0FF 55%, #F0FDF9 100%)',
        backgroundAttachment: 'fixed',
        color: '#1a1a2e',
      }}
    >
      <header style={{
        display: 'flex', alignItems: 'center', padding: '16px 28px',
        borderBottom: '1px solid rgba(26,26,46,0.08)',
      }}>
        <button
          onClick={() => router.push('/parent/dashboard')}
          className="font-space font-black gradient-wordmark"
          style={{ fontSize: 14, letterSpacing: '0.22em' }}
          aria-label="Parent dashboard"
        >
          ASTROLI
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSignOut}
          style={{
            fontSize: 11, letterSpacing: '0.15em', fontFamily: 'var(--font-space)',
            textTransform: 'uppercase', color: 'rgba(26,26,46,0.4)', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 28px' }}>
        {!loading && data && (
          <>
            <h1 style={{ fontFamily: 'var(--font-caveat)', fontSize: 30, color: '#1a1a2e', margin: '0 0 4px' }}>
              How&apos;s {childName ?? 'your child'} doing?
            </h1>
            <p style={{ fontSize: 10, letterSpacing: '0.28em', fontFamily: 'var(--font-space)', textTransform: 'uppercase', color: 'rgba(26,26,46,0.4)', marginBottom: 32 }}>
              {data.setupState.step === 'active' ? "This week's check-in" : 'Getting set up'}
            </p>
          </>
        )}

        {loading ? (
          <p style={{ fontSize: 10, letterSpacing: '0.3em', fontFamily: 'var(--font-space)', textTransform: 'uppercase', color: 'rgba(26,26,46,0.4)' }}>
            LOADING…
          </p>
        ) : !data ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {data.setupState.step !== 'active' ? (
              <Card title="Getting started">
                <SetupChecklist
                  step={data.setupState.step}
                  nextActionLabel={data.setupState.nextActionLabel}
                  nextActionHref={data.setupState.nextActionHref}
                  childName={childName}
                />
              </Card>
            ) : (
              <Card title={`This week with ${childName ?? 'your child'}`}>
                {data.weeklySignals.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {data.weeklySignals.map(signal => (
                      <WeeklySignalCard key={signal.signalType} signal={signal} />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'rgba(26,26,46,0.5)', margin: 0 }}>
                    {childName ?? 'Your child'} is on track — nothing needs your attention this week.
                  </p>
                )}
              </Card>
            )}

            {/* Journey + progress card */}
            <Card title={childName ? `${childName}'s journey` : "Your child's journey"}>
              {data.familyClass ? (
                <div>
                  <p style={{ fontWeight: 600, color: '#1a1a2e', margin: 0 }}>{data.familyClass.title}</p>
                  {data.missionProgress && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(26,26,46,0.45)', fontFamily: 'var(--font-space)', marginBottom: 6 }}>
                        <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>Progress</span>
                        <span>{data.missionProgress.completed} / {data.missionProgress.total} missions</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(26,26,46,0.08)' }}>
                        <div style={{
                          height: '100%', borderRadius: 999, transition: 'width 0.7s',
                          width: data.missionProgress.total > 0
                            ? `${(data.missionProgress.completed / data.missionProgress.total) * 100}%`
                            : '0%',
                          background: 'linear-gradient(90deg, #FF0080, #8B00FF)',
                        }} />
                      </div>
                      {data.missionProgress.activeMissionTitle && (
                        <p style={{ fontSize: 11, color: 'rgba(26,26,46,0.45)', marginTop: 8 }}>
                          Active: {data.missionProgress.activeMissionTitle}
                        </p>
                      )}
                      {!data.missionProgress.activeMissionId && data.missionProgress.completed < data.missionProgress.total && (
                        <p style={{ fontSize: 11, color: 'rgba(26,26,46,0.45)', marginTop: 8 }}>
                          {childName ?? 'Your child'} hasn&apos;t selected a mission yet.
                        </p>
                      )}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid rgba(26,26,46,0.08)', marginTop: 16, paddingTop: 14 }}>
                    <ChildProgress childName={childName} />
                  </div>
                </div>
              ) : data.child ? (
                <p style={{ fontSize: 13, color: 'rgba(26,26,46,0.5)', margin: 0 }}>No journey selected yet.</p>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(26,26,46,0.5)', margin: 0 }}>Set up your child&apos;s account first.</p>
              )}
            </Card>

            {/* Bot usage card */}
            <Card title="AI guide usage this month">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{data.botUsage.used}</span>
                  <span style={{ fontSize: 11, color: 'rgba(26,26,46,0.45)' }}>/ {data.botUsage.limit} conversations</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(26,26,46,0.08)', marginTop: 8 }}>
                  <div style={{
                    height: '100%', borderRadius: 999, transition: 'width 0.7s',
                    width: `${Math.min((data.botUsage.used / data.botUsage.limit) * 100, 100)}%`,
                    background: data.botUsage.used >= data.botUsage.limit
                      ? 'linear-gradient(90deg, #E24B4A, #A32D2D)'
                      : 'linear-gradient(90deg, #FF0080, #8B00FF)',
                  }} />
                </div>
                {data.botUsage.resetsAt && (
                  <p style={{ fontSize: 11, color: 'rgba(26,26,46,0.45)', marginTop: 8 }}>
                    Resets {new Date(data.botUsage.resetsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel" style={{ padding: '20px 24px' }}>
      <p style={{
        fontSize: 10, letterSpacing: '0.08em', fontFamily: 'var(--font-space)', fontWeight: 700,
        textTransform: 'uppercase', color: 'rgba(26,26,46,0.4)', marginBottom: 12,
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}
