'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSessionToken } from '@/lib/session';

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL ?? 'https://astorli-bot.vercel.app';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PlanetCharacter {
  id: string;
  planet_id: string;
  name: string;
  mode: 'real' | 'witness';
  bio: string;
  era: string;
  location: string;
  voice_profile: string;
  teaching_goal: string;
  knowledge_cutoff: string;
  portrait_url: string | null;
  listening_video_url: string | null;
}

export interface PlanetVoiceMessage {
  id: string;
  speaker: 'student' | 'figure' | 'orin';
  content: string;
}

export interface SummaryInsight {
  goalSlug: string;
  termName?: string;
  insightText: string;
  evidence: string;
}

export interface CoinAward {
  awarded:   boolean;
  amount:    number;
  newBalance: number;
  eventType: string;
  goalDescription?: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlanetVoice(planetId: string, language: 'en' | 'he' = 'en') {
  const [character,   setCharacter]   = useState<PlanetCharacter | null>(null);
  const [messages,    setMessages]    = useState<PlanetVoiceMessage[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [thinking,    setThinking]    = useState(false);
  const [charLoading,     setCharLoading]     = useState(true);
  const [charError,       setCharError]       = useState(false);
  const [completionReady,    setCompletionReady]    = useState(false);
  const [completionType,     setCompletionType]     = useState<'standard' | 'grace' | null>(null);
  const [summaryInsights,    setSummaryInsights]    = useState<SummaryInsight[]>([]);
  const [perkinsMap,         setPerkinsMap]         = useState<Record<string, number | null>>({});
  const [totalGoals,         setTotalGoals]         = useState<number | null>(null);
  const [goalJustCompleted,  setGoalJustCompleted]  = useState<{ slug: string } | null>(null);
  const [coinAward,          setCoinAward]          = useState<CoinAward | null>(null);
  const [showSummary,     setShowSummary]     = useState(false);
  const msgIdRef   = useRef(0);
  const isMounted  = useRef(true);
  const tokenRef   = useRef<string | null>(null);
  // Synchronous guard against concurrent/duplicate sends. `loading` state lags
  // a render behind, so two rapid triggers (Enter + click, double-tap) could
  // both pass the check and append the same turn twice — this ref cannot.
  const inFlightRef = useRef(false);

  const nextIdRef = useRef((prefix: string) => `${prefix}-${++msgIdRef.current}`);
  const nextId = nextIdRef.current;

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Resolve student ID, then fetch character + conversation history together
  useEffect(() => {
    if (!planetId) return;
    setCharLoading(true);
    setCharError(false);

    getSessionToken().then(token => {
      tokenRef.current = token;
      const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      return Promise.all([
        fetch(`${BOT_URL}/api/planet-voice/character?planetId=${encodeURIComponent(planetId)}&lang=${language}`).then(r => r.json()),
        fetch(`${BOT_URL}/api/planet-voice/history?planetId=${encodeURIComponent(planetId)}&lang=${language}`, { headers: authHeader }).then(r => r.json()),
      ]);
    }).then(([charData, histData]) => {
      if (!isMounted.current) return;
      setCharacter(charData.character ?? null);
      if (typeof histData.totalGoals === 'number') setTotalGoals(histData.totalGoals);
      if (histData.initialPerkinsMap && Object.keys(histData.initialPerkinsMap).length > 0) {
        setPerkinsMap(histData.initialPerkinsMap as Record<string, number | null>);
      }
      // Restore completion-readiness computed by the history endpoint so a
      // returning student sees the Complete Learning CTA immediately — it
      // shouldn't only exist as a one-turn side effect of the last chat message.
      if (histData.completionReady) {
        setCompletionReady(true);
        setCompletionType(histData.completionType ?? null);
        setSummaryInsights(histData.summaryInsights ?? []);
      }
      if (Array.isArray(histData.messages) && histData.messages.length > 0) {
        const prior: PlanetVoiceMessage[] = histData.messages.map((m: { role: string; content: string; speaker: string | null }) => ({
          id: nextId(m.speaker ?? m.role),
          speaker: m.role === 'user' ? 'student' : (m.speaker === 'orin' ? 'orin' : 'figure'),
          content: m.content,
        }));
        setMessages(prior);
      }
      setCharLoading(false);
    }).catch((err) => {
      // A network/CORS failure here is not "no character exists" — flag it so
      // the UI can distinguish an outage from a genuinely character-less planet.
      console.error('[usePlanetVoice] character/history fetch failed', err);
      if (isMounted.current) {
        setCharError(true);
        setCharLoading(false);
      }
    });
    // language is a dep so the character re-fetches localized once the
    // mission language resolves (it starts as 'en' before the mission loads).
  }, [planetId, language]);

  // One network turn: POSTs the message and applies the figure reply + side
  // effects. Returns 'ok' on a real reply, or 'retry' when it should be retried
  // — a network error, a non-2xx, or the server's graceful `retryable` fallback.
  // Never appends the student bubble and never toggles the thinking indicator;
  // the caller owns those so silent retries stay seamless and can't duplicate.
  // `isRetry` lets the server replay an already-persisted turn instead of
  // processing it twice.
  const runTurn = useCallback(async (text: string, isRetry: boolean): Promise<'ok' | 'retry' | 'consent'> => {
    // Fetch a fresh token each turn. The token was previously read once at mount
    // and cached in tokenRef, but Supabase access tokens expire after ~1h; the
    // SDK auto-refreshes in the background, yet the cached copy never updated —
    // so a long conversation started sending an expired token and every turn
    // 401'd mid-session. getSession() is served from the SDK's in-memory cache
    // (no network round-trip unless a refresh is actually due), so this is cheap.
    const token = (await getSessionToken()) ?? tokenRef.current;
    tokenRef.current = token;
    try {
      const res = await fetch(`${BOT_URL}/api/planet-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ planetId, message: text, language, isRetry }),
      });
      if (!isMounted.current) return 'ok';
      // A parental-consent block (428) is a definitive stop, not a transient
      // hiccup — retrying it 3× only to show the generic "words escape me"
      // fallback hides the real reason. Surface it immediately and clearly.
      if (res.status === 428) return 'consent';
      if (!res.ok) return 'retry';

      const data = await res.json();
      if (!isMounted.current) return 'ok';
      if (data.retryable) return 'retry';

      setMessages(prev => [...prev, {
        id: nextId('figure'),
        speaker: 'figure',
        content: data.figureMessage,
      }]);
      if (data.goalJustCompleted) setGoalJustCompleted(data.goalJustCompleted);
      if (data.reward) setCoinAward(data.reward);
      if (data.completionReady && !completionReady) {
        setCompletionReady(true);
        setCompletionType(data.completionType ?? null);
        setSummaryInsights(data.summaryInsights ?? []);
      }
      if (data.perkinsMap) setPerkinsMap(data.perkinsMap);
      if (typeof data.totalGoals === 'number' && totalGoals === null) setTotalGoals(data.totalGoals);
      return 'ok';
    } catch {
      return 'retry';
    }
  }, [planetId, language, completionReady, totalGoals, nextId]);

  // Send a message: append the student bubble once, then run the turn — silently
  // retrying a couple of times (the thinking indicator stays up) so a momentary
  // hiccup never surfaces. Only if every attempt fails does the figure say so in
  // character. The inFlightRef guard makes this idempotent against a double tap.
  const deliver = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || inFlightRef.current || !character) return;
    inFlightRef.current = true;
    setLoading(true);
    if (isMounted.current) setThinking(true);

    setMessages(prev => [...prev, {
      id: nextId('student'),
      speaker: 'student',
      content: trimmed,
    }]);

    // Backoff before each silent retry; length also sets how many retries run.
    const RETRY_DELAYS_MS = [1200, 2500];

    try {
      let outcome = await runTurn(trimmed, false);
      for (let attempt = 0; outcome === 'retry' && attempt < RETRY_DELAYS_MS.length && isMounted.current; attempt++) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        if (!isMounted.current) return;
        outcome = await runTurn(trimmed, true);
      }
      if (outcome === 'consent' && isMounted.current) {
        // Blocked pending parental consent — show a clear, out-of-character
        // notice so the student knows a parent must act, not that the bot broke.
        setMessages(prev => [...prev, {
          id: nextId('figure'),
          speaker: 'figure',
          content: language === 'he'
            ? 'כדי לשוחח כאן, הורה צריך קודם לאשר את שותף ה‑AI בחשבון הזה. אחרי שהאישור יושלם — חזרו ונתחיל!'
            : 'Before we can talk here, a parent needs to approve the AI companion for this account. Once that\'s done, come back and we\'ll begin!',
        }]);
      } else if (outcome === 'retry' && isMounted.current) {
        // Exhausted silent retries — stay in character, no system UI.
        setMessages(prev => [...prev, {
          id: nextId('figure'),
          speaker: 'figure',
          content: '...forgive me — the words escape me for a moment. Ask me once more?',
        }]);
      }
    } finally {
      if (isMounted.current) { setThinking(false); setLoading(false); }
      inFlightRef.current = false;
    }
  }, [character, runTurn, nextId, language]);

  const sendText = useCallback((text: string) => { void deliver(text); }, [deliver]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    void deliver(text);
  }, [input, deliver]);

  return {
    character,
    charLoading,
    charError,
    messages,
    input,
    setInput,
    send,
    sendText,
    loading,
    thinking,
    // completion flow
    goalJustCompleted,
    coinAward,
    completionReady,
    completionType,
    summaryInsights,
    perkinsMap,
    totalGoals,
    showSummary,
    setShowSummary,
  };
}
