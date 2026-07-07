'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type ParentRow = {
  id:           string;
  email:        string;
  name:         string | null;
  createdAt:    string;
  childEmail:   string | null;
  childName:    string | null;
  botUsed:      number;
  botLimit:     number;
  journeyTitle: string | null;
  missionsCompleted: number;
  missionsTotal:     number;
};

type Message = {
  id:             string;
  role:           'user' | 'assistant';
  content:        string;
  screen_context: string | null;
  created_at:     string;
};

export default function AdminPage() {
  const router = useRouter();

  const [tab, setTab]             = useState<'waitlisted' | 'approved'>('waitlisted');
  const [waitlisted, setWaitlisted] = useState<ParentRow[]>([]);
  const [approved,   setApproved]   = useState<ParentRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [approving,  setApproving]  = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const [drawerParent,  setDrawerParent]  = useState<ParentRow | null>(null);
  const [conversations, setConversations] = useState<Message[]>([]);
  const [convLoading,   setConvLoading]   = useState(false);

  async function load() {
    setLoading(true);
    const res  = await fetch('/api/admin/families');
    if (res.status === 401 || res.status === 403) { router.replace('/'); return; }
    const data = await res.json();
    setWaitlisted(data.waitlisted ?? []);
    setApproved(data.approved ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(email: string) {
    setApproving(email);
    setError(null);
    const res  = await fetch('/api/admin/families/approve', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();
    setApproving(null);
    if (!res.ok) { setError(data.error ?? 'Approval failed.'); return; }
    await load();
  }

  async function openDrawer(parent: ParentRow) {
    setDrawerParent(parent);
    setConvLoading(true);
    const res  = await fetch(`/api/admin/families/${parent.id}/conversations`);
    const data = await res.json();
    setConversations(data.conversations ?? []);
    setConvLoading(false);
  }

  const rows = tab === 'waitlisted' ? waitlisted : approved;

  return (
    <div className="min-h-screen bg-[#08060f] text-white">
      <header className="flex items-center gap-4 px-8 py-4 border-b border-white/8">
        <span className="font-mono font-bold text-sm tracking-widest text-white/60">ASTROLI ADMIN</span>
        <div className="flex-1" />
        <a href="/" className="text-[11px] text-white/40 hover:text-white/70 tracking-widest uppercase">← Exit</a>
      </header>

      <main className="px-8 py-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1">Family Track Monitor</h1>
        <p className="text-white/40 text-sm mb-6">Manage and monitor all parent-child accounts.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-lg bg-white/5 p-1 w-fit">
          {(['waitlisted', 'approved'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-md text-xs font-medium tracking-[0.12em] uppercase transition-colors ${
                tab === t ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t === 'waitlisted' ? `Waitlist (${waitlisted.length})` : `Approved (${approved.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-white/30 text-sm animate-pulse">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-white/30 text-sm">
            {tab === 'waitlisted' ? 'No one on the waitlist.' : 'No approved parents yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-[10px] tracking-[0.2em] text-white/30 uppercase">
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Child</th>
                  <th className="px-4 py-3 text-left">Journey</th>
                  <th className="px-4 py-3 text-left">Missions</th>
                  <th className="px-4 py-3 text-left">Bot cap</th>
                  <th className="px-4 py-3 text-left">Signed up</th>
                  <th className="px-4 py-3 text-left" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr
                    key={p.email}
                    className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-white/70">{p.email}</td>
                    <td className="px-4 py-3 text-white/60">{p.name ?? '—'}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">
                      {p.childName ? (
                        <span>
                          <span className="text-white/80">{p.childName}</span>
                          {p.childEmail && <span className="block text-white/35">{p.childEmail}</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-white/60 text-xs">{p.journeyTitle ?? '—'}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">
                      {p.missionsTotal > 0
                        ? `${p.missionsCompleted} / ${p.missionsTotal}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.botLimit > 0 ? (
                        <span className={p.botUsed >= p.botLimit ? 'text-red-400' : 'text-white/60'}>
                          {p.botUsed} / {p.botLimit}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {tab === 'waitlisted' && (
                          <button
                            onClick={() => handleApprove(p.email)}
                            disabled={approving === p.email}
                            className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-medium transition-colors"
                          >
                            {approving === p.email ? '…' : 'Approve'}
                          </button>
                        )}
                        {tab === 'approved' && p.id && (
                          <button
                            onClick={() => openDrawer(p)}
                            className="px-3 py-1 rounded-md border border-white/20 hover:border-white/40 text-xs text-white/60 hover:text-white transition-colors"
                          >
                            Chats
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Conversation drawer */}
      <AnimatePresence>
        {drawerParent && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerParent(null)}
            />
            <motion.aside
              className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-[#0e0b1a] border-l border-white/10 flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <div>
                  <p className="font-medium text-white/80">{drawerParent.childName ?? 'Child'}&apos;s conversations</p>
                  <p className="text-xs text-white/35">{drawerParent.childEmail ?? drawerParent.email}</p>
                </div>
                <button
                  onClick={() => setDrawerParent(null)}
                  className="text-white/40 hover:text-white text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {convLoading ? (
                  <p className="text-white/30 text-sm animate-pulse">Loading conversations…</p>
                ) : conversations.length === 0 ? (
                  <p className="text-white/30 text-sm">No conversations yet.</p>
                ) : (
                  conversations.map(msg => (
                    <div
                      key={msg.id}
                      className={`rounded-xl px-4 py-3 text-sm max-w-[90%] ${
                        msg.role === 'user'
                          ? 'bg-white/8 text-white/80 self-end ml-auto'
                          : 'bg-purple-900/30 text-purple-100 border border-purple-500/20'
                      }`}
                      style={{ display: 'block' }}
                    >
                      <p className="text-[10px] tracking-widest uppercase mb-1 opacity-40">
                        {msg.role === 'user' ? 'Child' : 'Orin'}{msg.screen_context ? ` · ${msg.screen_context}` : ''}
                      </p>
                      <p className="leading-relaxed">{msg.content}</p>
                      <p className="text-[10px] opacity-25 mt-1">
                        {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
