'use client';

// Per-student detail: activity sessions, missions, planet effort, store,
// and the conversation drawer.
// Spec: specs/founder/web-app/pilot-review-dashboard/ (User Stories 3–5).

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ConversationDrawer from '@/components/admin/ConversationDrawer';
import type { AdminStudentRow } from '@/lib/pilot-roster';

type SessionEntry = {
  id:              string;
  platform:        'web' | 'mobile' | 'bot';
  startedAt:       string;
  lastPingAt:      string;
  durationMinutes: number;
  approximate:     boolean;
};

type MissionEntry = {
  classTitle:       string;
  classType:        'school' | 'family';
  missionTitle:     string;
  state:            string;
  startedByStudent: boolean;
};

type PlanetEffortEntry = {
  planetTitle:      string;
  sessionCount:     number;
  totalTimeMinutes: number;
  lastMessageAt:    string | null;
  completedAt:      string | null;
  perkinsLevel:     number | null;
};

type StoreBlock = {
  balance:   number;
  rewards:   Array<{ eventType: string; amount: number; createdAt: string }>;
  inventory: Array<{ itemId: string; name: string; category: string; equipped: boolean; acquiredAt: string }>;
};

type StudentDetail = {
  profile:      AdminStudentRow;
  sessions:     SessionEntry[];
  missions:     MissionEntry[];
  planetEffort: PlanetEffortEntry[];
  store:        StoreBlock;
};

const MISSION_STATE_STYLES: Record<string, string> = {
  active:    'bg-purple-500/20 text-purple-200 border-purple-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  voting:    'bg-amber-500/15 text-amber-300 border-amber-500/25',
  locked:    'bg-white/5 text-white/40 border-white/10',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
      <h2 className="text-xs tracking-[0.2em] uppercase text-white/35 mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function AdminStudentDetailPage() {
  const router = useRouter();
  const { studentId } = useParams<{ studentId: string }>();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/admin/students/${studentId}`)
      .then((res) => {
        if (res.status === 401 || res.status === 403) { router.replace('/'); return null; }
        if (res.status === 404) { router.replace('/admin/students'); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setDetail(data.student ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [studentId, router]);

  if (loading) {
    return <main className="px-8 py-8"><p className="text-white/30 text-sm animate-pulse">Loading…</p></main>;
  }
  if (!detail) {
    return <main className="px-8 py-8"><p className="text-white/30 text-sm">Student not found.</p></main>;
  }

  const { profile, sessions, missions, planetEffort, store } = detail;

  return (
    <main className="px-8 py-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link href="/admin/students" className="text-[11px] text-white/35 hover:text-white/70 tracking-widest uppercase">
          ← All students
        </Link>
      </div>

      {/* Header card */}
      <section className="rounded-xl border border-white/8 bg-white/[0.02] p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <h1 className="text-xl font-semibold text-white/90">{profile.name}</h1>
          <p className="text-xs text-white/40">
            {profile.alienName && <span className="mr-3">{profile.alienName}</span>}
            {profile.email ?? 'no email'}
          </p>
        </div>
        <div className="text-xs text-white/50 space-y-1">
          <p>Track: <span className="text-white/80 capitalize">{profile.track}</span>
            {profile.parentName && <span className="text-white/40"> · parent: {profile.parentName}</span>}
          </p>
          <p>Class: <span className="text-white/80">{profile.classTitles.join(', ') || '—'}</span></p>
          <p>Enrolled: <span className="text-white/80">{profile.enrolledAt ? new Date(profile.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span></p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setDrawerOpen(true)}
          className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-xs font-medium tracking-[0.12em] uppercase transition-colors"
        >
          Conversations ({profile.messageCount})
        </button>
      </section>

      {/* Activity */}
      <Card title={`Activity — ${profile.sessionsLast7d ?? 0} sessions / ${profile.minutesLast7d ?? 0} min last 7 days`}>
        {sessions.length === 0 ? (
          <p className="text-white/30 text-sm">No visits recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center gap-3 text-sm">
                <span className="text-white/70 w-44 whitespace-nowrap">{formatDate(session.startedAt)}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] border ${
                  session.platform === 'mobile'
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/25'
                    : session.platform === 'web'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                      : 'bg-white/5 text-white/40 border-white/10'
                }`}>
                  {session.platform}
                </span>
                <span className="text-white/60">
                  {session.durationMinutes <= 1 ? '< 5 min' : `${session.durationMinutes} min`}
                </span>
                {session.approximate && (
                  <span className="text-[10px] text-amber-300/70 uppercase tracking-[0.12em]">approx (from chat history)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Missions */}
      <Card title="Mission & Progress">
        {missions.length === 0 ? (
          <p className="text-white/30 text-sm">No missions in this student&apos;s classes yet.</p>
        ) : (
          <ul className="space-y-2">
            {missions.map((mission, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] border ${MISSION_STATE_STYLES[mission.state] ?? MISSION_STATE_STYLES.locked}`}>
                  {mission.state}
                </span>
                <span className="text-white/75 flex-1">{mission.missionTitle}</span>
                <span className="text-xs text-white/35">{mission.classTitle}</span>
                {mission.startedByStudent && (
                  <span className="text-[10px] text-emerald-300/70 uppercase tracking-[0.12em]">started</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {planetEffort.length > 0 && (
          <div className="mt-5 border-t border-white/8 pt-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-3">Planet effort</p>
            <ul className="space-y-2">
              {planetEffort.map((planet, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-white/75 flex-1">{planet.planetTitle}</span>
                  <span className="text-xs text-white/45">{planet.sessionCount} sessions · {planet.totalTimeMinutes} min</span>
                  {planet.completedAt ? (
                    <span className="text-[10px] text-emerald-300/70 uppercase tracking-[0.12em]">
                      completed{planet.perkinsLevel !== null ? ` · L${planet.perkinsLevel}` : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/30 uppercase tracking-[0.12em]">in progress</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Store */}
      <Card title={`Store — ${store.balance} coins`}>
        {store.inventory.length === 0 && store.rewards.length === 0 ? (
          <p className="text-white/30 text-sm">No store activity yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-3">Owned items</p>
              {store.inventory.length === 0 ? (
                <p className="text-white/30 text-sm">Nothing purchased yet.</p>
              ) : (
                <ul className="space-y-2">
                  {store.inventory.map((item) => (
                    <li key={item.itemId} className="flex items-center gap-3 text-sm">
                      <span className="text-white/75 flex-1">{item.name}</span>
                      <span className="text-xs text-white/35 capitalize">{item.category}</span>
                      {item.equipped && (
                        <span className="text-[10px] text-purple-300/80 uppercase tracking-[0.12em]">equipped</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-3">Coins earned</p>
              {store.rewards.length === 0 ? (
                <p className="text-white/30 text-sm">No coin rewards yet.</p>
              ) : (
                <ul className="space-y-2">
                  {store.rewards.map((reward, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-white/60 flex-1">{reward.eventType.replaceAll('_', ' ')}</span>
                      <span className="text-emerald-300/80 text-xs">+{reward.amount}</span>
                      <span className="text-xs text-white/30 whitespace-nowrap">{formatDate(reward.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      <ConversationDrawer
        open={drawerOpen}
        title={`${profile.name}'s conversations`}
        subtitle={profile.email}
        fetchUrl={`/api/admin/students/${profile.id}/conversations`}
        studentLabel={profile.name}
        onClose={() => setDrawerOpen(false)}
      />
    </main>
  );
}
