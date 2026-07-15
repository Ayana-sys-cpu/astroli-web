'use client';

// Pilot roster: every enrolled student (family + classroom) in one table.
// Spec: specs/founder/web-app/pilot-review-dashboard/ (User Story 1).

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminStudentRow } from '@/lib/pilot-roster';

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TrackBadge({ track }: { track: AdminStudentRow['track'] }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] tracking-[0.12em] uppercase font-medium ${
        track === 'family'
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
          : 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
      }`}
    >
      {track}
    </span>
  );
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/students')
      .then((res) => {
        if (res.status === 401 || res.status === 403) { router.replace('/'); return null; }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setStudents(data.students ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const visibleStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((s) =>
      [s.name, s.alienName, s.email, ...s.classTitles]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(needle)),
    );
  }, [students, search]);

  return (
    <main className="px-8 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Pilot Students</h1>
      <p className="text-white/40 text-sm mb-6">
        Every enrolled student — family track and classroom — in one place.
      </p>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, alien name, email, or class…"
        className="mb-6 w-full max-w-sm rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-purple-500/50"
      />

      {loading ? (
        <p className="text-white/30 text-sm animate-pulse">Loading…</p>
      ) : visibleStudents.length === 0 ? (
        <p className="text-white/30 text-sm">
          {students.length === 0 ? 'No enrolled students yet.' : 'No students match your search.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[10px] tracking-[0.2em] text-white/30 uppercase">
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Track</th>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-left">Mission</th>
                <th className="px-4 py-3 text-left">Last active</th>
                <th className="px-4 py-3 text-right">Sessions 7d</th>
                <th className="px-4 py-3 text-right">Time 7d</th>
                <th className="px-4 py-3 text-right">Msgs</th>
                <th className="px-4 py-3 text-right">Coins</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((s, i) => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/admin/students/${s.id}`)}
                  className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
                >
                  <td className="px-4 py-3">
                    <span className="text-white/85">{s.name}</span>
                    {s.alienName && <span className="block text-xs text-white/35">{s.alienName}</span>}
                  </td>
                  <td className="px-4 py-3"><TrackBadge track={s.track} /></td>
                  <td className="px-4 py-3 text-white/60 text-xs">{s.classTitles.join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-white/60 text-xs max-w-[220px] truncate">
                    {s.activeMissionTitle ?? s.missionTitle ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {s.isActiveNow && (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 align-middle animate-pulse" />
                    )}
                    <span className={s.isActiveNow ? 'text-emerald-300' : 'text-white/50'}>
                      {s.isActiveNow ? 'active now' : relativeTime(s.lastActiveAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white/60 text-xs">{s.sessionsLast7d ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-white/60 text-xs">
                    {s.minutesLast7d === null ? '—' : `${s.minutesLast7d}m`}
                  </td>
                  <td className="px-4 py-3 text-right text-white/60 text-xs">{s.messageCount}</td>
                  <td className="px-4 py-3 text-right text-white/60 text-xs">{s.coins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
