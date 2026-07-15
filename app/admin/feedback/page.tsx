'use client';

// Founder feedback log: document out-of-band feedback (WhatsApp / email /
// in person), tag it to a student, and work it through
// new → reviewed → actioned.
// Spec: specs/founder/web-app/pilot-review-dashboard/ (User Story 2).

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FeedbackEntry, FeedbackSource, FeedbackStatus } from '@/lib/founder-feedback';
import type { AdminStudentRow } from '@/lib/pilot-roster';

const SOURCE_OPTIONS: Array<{ value: FeedbackSource; label: string }> = [
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'email',     label: 'Email' },
  { value: 'in_person', label: 'In person' },
  { value: 'other',     label: 'Other' },
];

const NEXT_STATUS: Record<FeedbackStatus, FeedbackStatus> = {
  new:      'reviewed',
  reviewed: 'actioned',
  actioned: 'new',
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new:      'bg-amber-500/15 text-amber-300 border-amber-500/25',
  reviewed: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  actioned: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
};

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log form state
  const [content, setContent] = useState('');
  const [source, setSource] = useState<FeedbackSource>('whatsapp');
  const [studentId, setStudentId] = useState<string>('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Inline notes editing
  const [notesEditingId, setNotesEditingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  async function loadEntries() {
    const res = await fetch('/api/admin/feedback');
    if (res.status === 401 || res.status === 403) { router.replace('/'); return; }
    const data = await res.json();
    setEntries(data.feedback ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
    fetch('/api/admin/students')
      .then((res) => (res.ok ? res.json() : { students: [] }))
      .then((data) => setStudents(data.students ?? []))
      .catch(() => {});
  }, []);

  async function handleLogFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const res = await fetch('/api/admin/feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: content.trim(), source, studentId: studentId || null, tags }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not save feedback.');
      return;
    }
    setContent('');
    setTagsInput('');
    setStudentId('');
    await loadEntries();
  }

  async function patchEntry(id: string, patch: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Update failed.');
      return;
    }
    await loadEntries();
  }

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (!needle) return true;
      return [entry.content, entry.studentName, entry.actionNotes, ...entry.tags]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(needle));
    });
  }, [entries, statusFilter, search]);

  return (
    <main className="px-8 py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Feedback Log</h1>
      <p className="text-white/40 text-sm mb-6">
        Document what you hear from pilot families — then work it: new → reviewed → actioned.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Log form */}
      <form onSubmit={handleLogFeedback} className="rounded-xl border border-white/8 bg-white/[0.02] p-5 mb-8 space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or type the feedback you received…"
          rows={3}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-purple-500/50 resize-y"
        />
        <div className="flex flex-wrap gap-3">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as FeedbackSource)}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-purple-500/50"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#0e0b1a]">{option.label}</option>
            ))}
          </select>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-purple-500/50 max-w-[220px]"
          >
            <option value="" className="bg-[#0e0b1a]">General / parent (no student)</option>
            {students.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0e0b1a]">{s.name}{s.alienName ? ` (${s.alienName})` : ''}</option>
            ))}
          </select>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Tags, comma-separated"
            className="flex-1 min-w-[160px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/70 placeholder:text-white/25 focus:outline-none focus:border-purple-500/50"
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-5 py-2 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-medium tracking-[0.12em] uppercase transition-colors"
          >
            {submitting ? 'Saving…' : 'Log feedback'}
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {(['all', 'new', 'reviewed', 'actioned'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-md text-[11px] font-medium tracking-[0.12em] uppercase transition-colors ${
                statusFilter === status ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search feedback…"
          className="flex-1 min-w-[180px] max-w-xs rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-purple-500/50"
        />
      </div>

      {/* Entries */}
      {loading ? (
        <p className="text-white/30 text-sm animate-pulse">Loading…</p>
      ) : visibleEntries.length === 0 ? (
        <p className="text-white/30 text-sm">
          {entries.length === 0 ? 'Nothing logged yet — paste your first piece of feedback above.' : 'No entries match.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleEntries.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => patchEntry(entry.id, { status: NEXT_STATUS[entry.status] })}
                  title={`Mark as ${NEXT_STATUS[entry.status]}`}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.12em] border transition-opacity hover:opacity-75 ${STATUS_STYLES[entry.status]}`}
                >
                  {entry.status}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                  <p className="text-[11px] text-white/35 mt-2">
                    {entry.studentName ?? 'General'} · {SOURCE_OPTIONS.find((o) => o.value === entry.source)?.label ?? entry.source}
                    {' · '}
                    {new Date(entry.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {entry.tags.length > 0 && (
                      <span className="ml-2">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="inline-block mr-1 px-1.5 py-0.5 rounded bg-white/5 text-white/45">#{tag}</span>
                        ))}
                      </span>
                    )}
                  </p>
                  {notesEditingId === entry.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="What did you do about it?"
                        autoFocus
                        className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white/70 placeholder:text-white/25 focus:outline-none focus:border-purple-500/50"
                      />
                      <button
                        onClick={async () => {
                          await patchEntry(entry.id, { actionNotes: notesDraft.trim() || null });
                          setNotesEditingId(null);
                        }}
                        className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-[11px] uppercase tracking-[0.12em]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setNotesEditingId(null)}
                        className="px-2 py-1.5 text-[11px] text-white/40 hover:text-white/70 uppercase tracking-[0.12em]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNotesEditingId(entry.id); setNotesDraft(entry.actionNotes ?? ''); }}
                      className="mt-2 text-left text-xs text-white/45 hover:text-white/70 transition-colors"
                    >
                      {entry.actionNotes
                        ? <span>📝 {entry.actionNotes}</span>
                        : <span className="italic text-white/25">+ add action note</span>}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
