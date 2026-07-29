'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import type { DiveTurn, Segment } from '@/lib/orin-dive';
import ChatPane from './ChatPane';
import MediaCanvas from './MediaCanvas';

export default function DivePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [topic, setTopic] = useState('');
  const [turns, setTurns] = useState<DiveTurn[] | null>(null);
  const [sending, setSending] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/master/dive/${id}`);
        if (res.status === 401 || res.status === 403) { router.replace('/master'); return; }
        if (!res.ok) { setTurns([]); return; }
        const data = await res.json();
        setTopic(data.session?.topic ?? '');
        const messages: DiveTurn[] = data.messages ?? [];
        setTurns(messages);
        // The dive was opened the moment it was created, so Orin may not have
        // written yet — ask for his opening here, where the student can watch
        // it arrive instead of waiting on the button they pressed.
        if (messages.length === 0) await fetchOpening();
      } catch {
        setTurns([]);
      }
    })();
  }, [id, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOpening = useCallback(async () => {
    setSending(true);
    setRecharging(false);
    try {
      const res = await fetch(`/api/master/dive/${id}/opening`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.segments) {
        setTurns([{ role: 'orin', segments: data.segments }]);
      } else {
        setRecharging(true);
      }
    } catch {
      setRecharging(true);
    } finally {
      setSending(false);
    }
  }, [id]);

  const send = useCallback(async (text: string) => {
    setSending(true);
    setRecharging(false);
    setTurns((prev) => [...(prev ?? []), { role: 'student', segments: [{ type: 'text', text }] }]);
    try {
      const res = await fetch(`/api/master/dive/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.reply?.segments) {
        setTurns((prev) => [...(prev ?? []), { role: 'orin', segments: data.reply.segments }]);
      } else {
        setRecharging(true);
      }
    } catch {
      setRecharging(true);
    } finally {
      setSending(false);
    }
  }, [id]);

  const keepDive = useCallback(async () => {
    setSaved(true);
    try {
      await fetch('/api/master/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dive_session_id: id }),
      });
    } catch {
      setSaved(false);
    }
  }, [id]);

  const visuals: Segment[] = useMemo(
    () => (turns ?? []).flatMap((t) => t.segments.filter((s) => s.type !== 'text')).reverse(),
    [turns],
  );

  return (
    <main className="relative h-screen overflow-hidden" style={{ background: 'var(--master-ink)' }}>
      <StarField count={60} seed={11} />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/master')}
            className="text-[12px]"
            style={{ color: 'var(--master-text-muted)', fontFamily: 'var(--font-space)' }}
          >
            ← Master
          </button>
          <button
            type="button"
            onClick={keepDive}
            disabled={saved}
            className="rounded-full border px-4 py-1.5 text-[12px] text-white transition-colors hover:bg-white/5 disabled:opacity-50"
            style={{ borderColor: 'var(--master-hairline)', fontFamily: 'var(--font-space)' }}
          >
            {saved ? 'Saved to Master ✓' : 'Save this dive'}
          </button>
        </div>

        {turns === null ? (
          <p className="mt-10 text-center text-[13px]" style={{ color: 'var(--master-text-muted)' }}>
            Opening your exploration…
          </p>
        ) : (
          <div className="grid min-h-0 flex-1 gap-5 md:grid-cols-[1fr_1.15fr]">
            <ChatPane
              topic={topic}
              turns={turns}
              sending={sending}
              recharging={recharging}
              onSend={send}
            />
            <div className="min-h-0">
              <MediaCanvas segments={visuals} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
