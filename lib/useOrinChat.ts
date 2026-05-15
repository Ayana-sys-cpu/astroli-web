'use client';

import { useState } from 'react';
import { getStudentId } from '@/lib/student-store';

const BOT_URL    = 'https://astorli-bot.vercel.app/api/bot';
const FALLBACK_ID = '00000000-0000-0000-0000-000000000001';

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export function useOrinChat(screen: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const studentId = getStudentId() ?? FALLBACK_ID;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch(BOT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ studentId, message: msg, screen }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'Signal lost.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Catching static — try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return { messages, input, setInput, loading, send };
}
