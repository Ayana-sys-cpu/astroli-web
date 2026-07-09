'use client';

import { useState, useEffect, useRef } from 'react';
import { getSessionStudentId } from '@/lib/session';

const BOT_URL          = 'https://astorli-bot.vercel.app/api/bot';
const OPENING_URL      = 'https://astorli-bot.vercel.app/api/opening-message';
const FALLBACK_ID      = '00000000-0000-0000-0000-000000000001';

export interface QuickReply   { label: string; value: string }
export interface ChatMessage  {
  role:         'user' | 'assistant';
  content:      string;
  quickReplies?: QuickReply[];
}

// screen      — which screen the student is on (big_question, plant_screen, etc.)
// contentId   — the mission or planet DB id (e.g. 'seed-mission-1', 'seed-planet-2-3')
// contentType — 'mission' | 'planet' — determines which table to query
// language    — mission language; drives prompt file selection and opening message
export function useOrinChat(
  screen:       string,
  contentId?:   string,
  contentType?: 'mission' | 'planet',
  language:     'en' | 'he' = 'en',
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const openingFetched = useRef(false);

  // Auto-load the alien bot's first-entrance opening message on mount.
  useEffect(() => {
    if (!contentId || !contentType || openingFetched.current) return;
    openingFetched.current = true;

    getSessionStudentId().then(id => {
      const studentId = id ?? FALLBACK_ID;
      fetch(`${OPENING_URL}?type=${contentType}&contentId=${contentId}&studentId=${studentId}&lang=${language}`)
        .then(r => r.json())
        .then(data => {
          if (data.message) {
            setMessages([{
              role:         'assistant',
              content:      data.message,
              quickReplies: data.quickReplies ?? [],
            }]);
          }
        })
        .catch(() => {
          // Silently ignore — chat still works without the opening message
        });
    });
  }, [contentId, contentType]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const studentId = (await getSessionStudentId()) ?? FALLBACK_ID;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch(BOT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          studentId,
          message:        msg,
          screen,
          language,
          currentPlanet:  contentType === 'planet'  ? contentId : undefined,
          currentMission: contentType === 'mission' ? contentId : undefined,
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role:         'assistant',
          content:      data.message ?? 'Signal lost.',
          quickReplies: data.quickReplies ?? [],
        },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Catching static — try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return { messages, input, setInput, loading, send };
}
