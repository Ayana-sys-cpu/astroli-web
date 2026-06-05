'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSessionStudentId } from '@/lib/session';

const BOT_URL = 'https://astorli-bot.vercel.app';

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
  thinking_video_url: string | null;
}

export interface PlanetVoiceMessage {
  id: string;
  speaker: 'student' | 'figure' | 'orin';
  content: string;
}

export interface SummaryInsight {
  goalSlug: string;
  insightText: string;
  evidence: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlanetVoice(planetId: string) {
  const [character,   setCharacter]   = useState<PlanetCharacter | null>(null);
  const [messages,    setMessages]    = useState<PlanetVoiceMessage[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [thinking,    setThinking]    = useState(false);
  const [charLoading,     setCharLoading]     = useState(true);
  const [completionReady, setCompletionReady] = useState(false);
  const [completionType,  setCompletionType]  = useState<'standard' | 'grace' | null>(null);
  const [summaryInsights, setSummaryInsights] = useState<SummaryInsight[]>([]);
  const [perkinsMap,      setPerkinsMap]      = useState<Record<string, number | null>>({});
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
        fetch(`${BOT_URL}/api/planet-voice/character?planetId=${encodeURIComponent(planetId)}`).then(r => r.json()),
        fetch(`${BOT_URL}/api/planet-voice/history?studentId=${encodeURIComponent(studentId)}&planetId=${encodeURIComponent(planetId)}`).then(r => r.json()),
      ]);
    }).then(([charData, histData]) => {
      if (!isMounted.current) return;
      setCharacter(charData.character ?? null);
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
  }, [planetId]);

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
        body: JSON.stringify({ studentId, planetId, message: text.trim() }),
      });

      if (!isMounted.current) return;
      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();
      const newMessages: PlanetVoiceMessage[] = [
        { id: nextId('figure'), speaker: 'figure', content: data.figureMessage },
      ];
      if (data.orinMessage) {
        newMessages.push({ id: nextId('orin'), speaker: 'orin', content: data.orinMessage });
      }
      if (isMounted.current) {
        setMessages(prev => [...prev, ...newMessages]);
        if (data.completionReady && !completionReady) {
          setCompletionReady(true);
          setCompletionType(data.completionType ?? null);
          setSummaryInsights(data.summaryInsights ?? []);
        }
        if (data.perkinsMap) setPerkinsMap(data.perkinsMap);
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
  }, [loading, character, planetId, completionReady]);

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
        body: JSON.stringify({ studentId, planetId, message: text }),
      });

      if (!isMounted.current) return;

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();

      const newMessages: PlanetVoiceMessage[] = [
        { id: nextId('figure'), speaker: 'figure', content: data.figureMessage },
      ];
      if (data.orinMessage) {
        newMessages.push({ id: nextId('orin'), speaker: 'orin', content: data.orinMessage });
      }

      if (isMounted.current) {
        setMessages(prev => [...prev, ...newMessages]);
        if (data.completionReady && !completionReady) {
          setCompletionReady(true);
          setCompletionType(data.completionType ?? null);
          setSummaryInsights(data.summaryInsights ?? []);
        }
        if (data.perkinsMap) setPerkinsMap(data.perkinsMap);
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
  }, [input, loading, character, planetId, completionReady]);

  const askOrin = useCallback(async () => {
    if (loading) return;
    const studentId = studentIdRef.current ?? '00000000-0000-0000-0000-000000000001';
    setLoading(true);
    try {
      const res = await fetch(`${BOT_URL}/api/planet-voice/orin-help`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, planetId }),
      });
      if (!isMounted.current) return;
      const data = await res.json();
      if (data.orinMessage) {
        setMessages(prev => [...prev, {
          id: nextId('orin'),
          speaker: 'orin',
          content: data.orinMessage,
        }]);
      }
    } catch {
      // silent — Orin help is optional
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [loading, planetId]);

  return {
    character,
    charLoading,
    messages,
    input,
    setInput,
    send,
    sendText,
    askOrin,
    loading,
    thinking,
    // completion flow
    completionReady,
    completionType,
    summaryInsights,
    perkinsMap,
    showSummary,
    setShowSummary,
    studentId: studentIdRef.current,
  };
}
