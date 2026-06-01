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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlanetVoice(planetId: string) {
  const [character,   setCharacter]   = useState<PlanetCharacter | null>(null);
  const [messages,    setMessages]    = useState<PlanetVoiceMessage[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [thinking,    setThinking]    = useState(false);
  const [charLoading, setCharLoading] = useState(true);
  const msgIdRef     = useRef(0);
  const isMounted    = useRef(true);
  const studentIdRef = useRef<string | null>(null);

  const nextId = (prefix: string) => `${prefix}-${++msgIdRef.current}`;

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Load student ID once
  useEffect(() => {
    getSessionStudentId().then(id => {
      studentIdRef.current = id ?? '00000000-0000-0000-0000-000000000001';
    });
  }, []);

  // Fetch approved character for this planet
  useEffect(() => {
    if (!planetId) return;
    setCharLoading(true);
    fetch(`${BOT_URL}/api/planet-voice/character?planetId=${encodeURIComponent(planetId)}`)
      .then(r => r.json())
      .then(data => {
        if (isMounted.current) {
          setCharacter(data.character ?? null);
          setCharLoading(false);
        }
      })
      .catch(() => {
        if (isMounted.current) setCharLoading(false);
      });
  }, [planetId]);

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
      setThinking(false);

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();

      const newMessages: PlanetVoiceMessage[] = [
        { id: nextId('figure'), speaker: 'figure', content: data.figureMessage },
      ];
      if (data.orinMessage) {
        newMessages.push({ id: nextId('orin'), speaker: 'orin', content: data.orinMessage });
      }

      if (isMounted.current) setMessages(prev => [...prev, ...newMessages]);
    } catch {
      if (!isMounted.current) return;
      setThinking(false);
      setMessages(prev => [...prev, {
        id: nextId('error'),
        speaker: 'figure',
        content: '...forgive me. The words have left me for a moment.',
      }]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [input, loading, character, planetId]);

  return {
    character,
    charLoading,
    messages,
    input,
    setInput,
    send,
    loading,
    thinking,
  };
}
