'use client';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import StarField from '@/components/StarField';
import StudentHeader from '@/components/StudentHeader';
import type { DiveTurn, Segment, SourceEdit } from '@/lib/orin-dive';
import ChatPane from './ChatPane';
import MediaCanvas from './MediaCanvas';

function DiveScreen() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  // The topic rides along from Master so the screen paints complete instantly,
  // before its own data fetch returns.
  const initialTopic = useSearchParams().get('topic') ?? '';

  const [topic, setTopic] = useState(initialTopic);
  const [source, setSource] = useState<SourceEdit | null>(null);
  const [turns, setTurns] = useState<DiveTurn[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [sending, setSending] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [saved, setSaved] = useState(false);
  // Messages that existed before this visit render instantly; only turns
  // arriving live get the typewriter reveal.
  const animateFrom = useRef(Number.MAX_SAFE_INTEGER);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/master/dive/${id}`);
        // A dive that no longer exists (or was never yours) is a dead end —
        // bounce home instead of leaving a chat that can only fail.
        if (!res.ok) { router.replace('/master'); return; }
        const data = await res.json();
        setTopic(data.session?.topic ?? '');
        setSource(data.source ?? null);
        const messages: DiveTurn[] = data.messages ?? [];
        animateFrom.current = messages.length;
        setTurns(messages);
        setHydrated(true);
        // The dive was opened the moment it was created, so Orin may not have
        // written yet — ask for his opening here, where the student can watch
        // it arrive instead of waiting on the button they pressed.
        if (messages.length === 0) await fetchOpening();
      } catch {
        router.replace('/master');
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

  // The canvas opens on demand: automatically when Orin builds something new,
  // or when the student taps a visual chip in the stream.
  type VisualSegment = Extract<Segment, { type: 'visual' }>;
  const [openVisual, setOpenVisual] = useState<VisualSegment | null>(null);
  const lastVisual = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const v = turns[i].segments.find((s): s is VisualSegment => s.type === 'visual');
      if (v) return { v, turn: i };
    }
    return null;
  }, [turns]);

  useEffect(() => {
    if (lastVisual && lastVisual.turn >= animateFrom.current) setOpenVisual(lastVisual.v);
  }, [lastVisual]);

  return (
    <main className="relative flex h-screen flex-col overflow-hidden" style={{ background: 'var(--master-ink)' }}>
      <StarField count={60} seed={11} />

      <StudentHeader back={{ label: 'backMaster', href: '/master' }} storeOriginLabel="backMaster" />

      <div className="relative mx-auto flex min-h-0 flex-1 w-full max-w-6xl flex-col px-6 pb-5 pt-4">
        <div className="mb-3 flex items-center justify-end">
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

        <div
          className={`grid min-h-0 flex-1 gap-5 ${openVisual ? 'md:grid-cols-[1fr_1.15fr]' : ''} ${
            openVisual ? '' : 'mx-auto w-full max-w-3xl'
          }`}
        >
          <ChatPane
            topic={topic}
            source={source}
            turns={turns}
            hydrating={!hydrated}
            animateFrom={animateFrom.current}
            sending={sending}
            recharging={recharging}
            onSend={send}
            onOpenVisual={setOpenVisual}
          />
          {openVisual && (
            <div className="hidden min-h-0 md:block">
              <MediaCanvas visual={openVisual} onClose={() => setOpenVisual(null)} />
            </div>
          )}
        </div>

        {/* On phones the interactive takes the whole screen while open. */}
        {openVisual && (
          <div className="fixed inset-0 z-40 flex flex-col p-4 md:hidden" style={{ background: 'var(--master-ink)' }}>
            <MediaCanvas visual={openVisual} onClose={() => setOpenVisual(null)} />
          </div>
        )}
      </div>
    </main>
  );
}

// useSearchParams needs a Suspense boundary in the App Router.
export default function DivePage() {
  return (
    <Suspense fallback={null}>
      <DiveScreen />
    </Suspense>
  );
}
