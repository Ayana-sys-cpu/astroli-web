'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSessionStudentId } from '@/lib/session';

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
  const [completionReady,    setCompletionReady]    = useState(false);
  const [completionType,     setCompletionType]     = useState<'standard' | 'grace' | null>(null);
  const [summaryInsights,    setSummaryInsights]    = useState<SummaryInsight[]>([]);
  const [perkinsMap,         setPerkinsMap]         = useState<Record<string, number | null>>({});
  const [totalGoals,         setTotalGoals]         = useState<number | null>(null);
  const [goalJustCompleted,  setGoalJustCompleted]  = useState<{ slug: string } | null>(null);
  const [coinAward,          setCoinAward]          = useState<CoinAward | null>(null);
  const [showSummary,     setShowSummary]     = useState(false);
  const msgIdRef     = useRef(0);
  const isMounted    = useRef(true);
  const studentIdRef = useRef<string | null>(null);

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

    getSessionStudentId().then(id => {
      const studentId = id ?? '00000000-0000-0000-0000-000000000001';
      studentIdRef.current = studentId;

      return Promise.all([
        fetch(`${BOT_URL}/api/planet-voice/character?planetId=${encodeURIComponent(planetId)}&lang=${language}`).then(r => r.json()),
        fetch(`${BOT_URL}/api/planet-voice/history?studentId=${encodeURIComponent(studentId)}&planetId=${encodeURIComponent(planetId)}&lang=${language}`).then(r => r.json()),
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
    }).catch(() => {
      if (isMounted.current) setCharLoading(false);
    });
    // language is a dep so the character re-fetches localized once the
    // mission language resolves (it starts as 'en' before the mission loads).
  }, [planetId, language]);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || loading || !character) return;

    const studentId = studentIdRef.current ?? '00000000-0000-0000-0000-000000000001';

    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, {
      id: nextId('student'),
      speaker: 'student',
      content: text.trim(),
    }]);

    try {
      if (isMounted.current) setThinking(true);

      const res = await fetch(`${BOT_URL}/api/planet-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, planetId, message: text.trim(), language }),
      });

      if (!isMounted.current) return;
      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      if (isMounted.current) {
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
      }
    } catch {
      if (!isMounted.current) return;
      setMessages(prev => [...prev, {
        id: nextId('error'),
        speaker: 'figure',
        content: '...forgive me. The words have left me for a moment.',
      }]);
    } finally {
      if (isMounted.current) { setThinking(false); setLoading(false); }
    }
  }, [loading, character, planetId, language, completionReady]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !character) return;

    const studentId = studentIdRef.current ?? '00000000-0000-0000-0000-000000000001';

    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, {
      id: nextId('student'),
      speaker: 'student',
      content: text,
    }]);

    try {
      if (isMounted.current) setThinking(true);

      const res = await fetch(`${BOT_URL}/api/planet-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, planetId, message: text, language }),
      });

      if (!isMounted.current) return;
      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();

      if (isMounted.current) {
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
      }
    } catch {
      if (!isMounted.current) return;
      setMessages(prev => [...prev, {
        id: nextId('error'),
        speaker: 'figure',
        content: '...forgive me. The words have left me for a moment.',
      }]);
    } finally {
      if (isMounted.current) {
        setThinking(false);
        setLoading(false);
      }
    }
  }, [input, loading, character, planetId, language, completionReady]);

  return {
    character,
    charLoading,
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
    studentId: studentIdRef.current,
  };
}
