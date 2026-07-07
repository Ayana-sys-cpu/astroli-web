'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/StarField';
import { supabaseSignOut } from '@/lib/session';
import { clearSession } from '@/lib/student-store';

type DashboardData = {
  child:           { id: string; name: string } | null;
  familyClass:     { id: string; title: string; journeyId: string } | null;
  missionProgress: {
    total:              number;
    completed:          number;
    activeMissionId:    string | null;
    activeMissionTitle: string | null;
  } | null;
  botUsage: { used: number; limit: number; resetsAt: string | null };
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-black overflow-hidden"
    >
      <StarField count={80} seed={11} />

      <header className="relative z-10 flex items-center px-7 py-4 border-b border-white/8">
        <button
          onClick={() => router.push('/parent/dashboard')}
          className="font-space font-black text-sm tracking-[0.22em] gradient-wordmark"
          aria-label="Parent dashboard"
        >
          ASTROLI
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSignOut}
          className="text-[11px] tracking-[0.15em] font-space uppercase text-white/40 hover:text-white/70 transition-colors"
        >
          Sign out
        </button>
      </header>

      <div className="relative z-10 px-7 py-8 max-w-2xl mx-auto">
        <h1 className="font-caveat text-3xl text-white/80 mb-1">Parent Dashboard</h1>
        <p className="text-[10px] tracking-[0.28em] font-space uppercase text-white/30 mb-8">
          Monitor your child&apos;s learning journey
        </p>

        {loading ? (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="text-[10px] tracking-[0.3em] font-space uppercase text-white/40"
          >
            LOADING…
          </motion.div>
        ) : !data ? null : (
          <div className="space-y-4">
            {/* Child card */}
            <Card title="Your child">
              {data.child ? (
                <p className="text-white/80 font-medium">{data.child.name}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-white/50 text-sm">No child linked yet.</p>
                  <button
                    onClick={() => router.push('/parent/onboarding')}
                    className="text-sm text-primary underline underline-offset-4"
                  >
                    Set up your child&apos;s account →
                  </button>
                </div>
              )}
            </Card>

            {/* Journey card */}
            <Card title="Learning journey">
              {data.familyClass ? (
                <div className="space-y-1">
                  <p className="text-white/80 font-medium">{data.familyClass.title}</p>
                  {data.missionProgress && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-white/40 font-space mb-1.5">
                        <span className="tracking-widest uppercase">Progress</span>
                        <span>{data.missionProgress.completed} / {data.missionProgress.total} missions</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-white/8">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: data.missionProgress.total > 0
                              ? `${(data.missionProgress.completed / data.missionProgress.total) * 100}%`
                              : '0%',
                            background: 'linear-gradient(90deg, #7b2fbe, #00c4cc)',
                          }}
                        />
                      </div>
                      {data.missionProgress.activeMissionTitle && (
                        <p className="text-[11px] text-white/35 mt-2">
                          Active: {data.missionProgress.activeMissionTitle}
                        </p>
                      )}
                      {!data.missionProgress.activeMissionId && data.missionProgress.completed < data.missionProgress.total && (
                        <p className="text-[11px] text-white/35 mt-2">
                          Your child hasn&apos;t selected a mission yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : data.child ? (
                <div className="space-y-2">
                  <p className="text-white/50 text-sm">No journey selected yet.</p>
                  <button
                    onClick={() => router.push('/parent/onboarding?step=journey')}
                    className="text-sm text-primary underline underline-offset-4"
                  >
                    Choose a journey →
                  </button>
                </div>
              ) : (
                <p className="text-white/50 text-sm">Set up your child&apos;s account first.</p>
              )}
            </Card>

            {/* Bot usage card */}
            <Card title="AI guide usage this month">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-white/80 font-medium">{data.botUsage.used}</span>
                  <span className="text-[11px] text-white/40">/ {data.botUsage.limit} conversations</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-white/8">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((data.botUsage.used / data.botUsage.limit) * 100, 100)}%`,
                      background: data.botUsage.used >= data.botUsage.limit
                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                        : 'linear-gradient(90deg, #7b2fbe, #00c4cc)',
                    }}
                  />
                </div>
                {data.botUsage.resetsAt && (
                  <p className="text-[11px] text-white/35">
                    Resets {new Date(data.botUsage.resetsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[18px] p-5"
      style={{
        background: 'linear-gradient(145deg, #1a1726 0%, #14121d 100%)',
        border: '1px solid rgba(160,32,240,0.18)',
      }}
    >
      <p className="text-[10px] tracking-[0.25em] font-space uppercase text-white/30 mb-3">{title}</p>
      {children}
    </div>
  );
}
