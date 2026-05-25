'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getStudentId, getBotName, getCachedAvatarUrl, loadStudent } from '@/lib/student-store';

const BOT_URL     = 'https://astorli-bot.vercel.app/api/bot';
const OPENING_URL = 'https://astorli-bot.vercel.app/api/opening-message';
const FALLBACK_ID = '00000000-0000-0000-0000-000000000001';

function screenFromPath(pathname: string): string {
  if (pathname.startsWith('/onboarding'))   return 'onboarding';
  if (pathname.startsWith('/landscape'))    return 'plant_screen';
  if (pathname.startsWith('/mission'))      return 'mission_landscape_hub';
  return 'mission_landscape_hub';
}

// Derive content type + ID from the URL so the floating bot can load opening messages.
// landscape/[id] → plant  |  mission/[id] → mission (ID extracted from URL segment)
function contentFromPath(pathname: string): { contentType: 'mission' | 'plant'; contentId: string } | null {
  const plantMatch = pathname.match(/^\/landscape\/([^/]+)/);
  if (plantMatch) return { contentType: 'plant', contentId: plantMatch[1] };

  const missionMatch = pathname.match(/^\/mission\/([^/]+)/);
  if (missionMatch) return { contentType: 'mission', contentId: missionMatch[1] };

  return null;
}

interface QuickReply { label: string; value: string }
interface Message {
  role:         'user' | 'assistant';
  content:      string;
  quickReplies?: QuickReply[];
}

export default function AvatarBot() {
  const pathname = usePathname();
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [botName, setBotName] = useState('Scout');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const openingFetched = useRef(false);

  useEffect(() => {
    setBotName(getBotName());
    setAvatarUrl(getCachedAvatarUrl() ?? loadStudent()?.baseAvatarUrl ?? null);
  }, []);

  const screen  = screenFromPath(pathname);
  const content = contentFromPath(pathname);

  // When the panel opens for the first time on a mission/plant screen,
  // fetch Pip's opening message from the shared bot API.
  useEffect(() => {
    if (!open || !content || openingFetched.current) return;
    openingFetched.current = true;

    const studentId = getStudentId() ?? FALLBACK_ID;
    const { contentType, contentId } = content;

    fetch(`${OPENING_URL}?type=${contentType}&contentId=${contentId}&studentId=${studentId}`)
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
      .catch(() => {});
  }, [open, content]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const studentId = getStudentId() ?? FALLBACK_ID;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch(BOT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          studentId,
          message:        text,
          screen,
          currentPlant:   content?.contentType === 'plant'   ? content.contentId : undefined,
          currentMission: content?.contentType === 'mission' ? content.contentId : undefined,
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role:         'assistant',
          content:      data.message ?? 'Signal lost — try again.',
          quickReplies: data.quickReplies ?? [],
        },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Signal lost — try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(139,92,246,0.3)', backdropFilter: 'blur(12px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
            <span className="text-sm font-semibold text-white">{botName} · Your Alien Scout</span>
            <button onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white text-xl leading-none transition-colors">×</button>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-72 min-h-28">
            {messages.length === 0 && (
              <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Tap to sync with your alien companion...
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col">
                <div
                  className={`px-3 py-2 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                    m.role === 'user' ? 'self-end text-white' : 'self-start text-white/90'
                  }`}
                  style={m.role === 'user'
                    ? { background: 'rgba(79,70,229,0.8)' }
                    : { background: 'rgba(255,255,255,0.08)' }}>
                  {m.content}
                </div>

                {/* Quick replies — only on last assistant message, only when not loading */}
                {m.role === 'assistant' &&
                  i === messages.length - 1 &&
                  !loading &&
                  m.quickReplies && m.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                    {m.quickReplies.map((qr, qi) => (
                      <button
                        key={qi}
                        onClick={() => send(qr.value)}
                        className="text-xs px-3 py-1.5 rounded-full font-medium transition-opacity hover:opacity-80 active:opacity-60"
                        style={{
                          background: 'rgba(79,70,229,0.2)',
                          border:     '1px solid rgba(79,70,229,0.5)',
                          color:      'rgba(255,255,255,0.85)',
                        }}>
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="self-start px-3 py-2 rounded-xl text-xs"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                syncing...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              className="flex-1 rounded-lg px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/30"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="Say something..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button onClick={() => send()} disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-opacity"
              style={{ background: 'rgba(79,70,229,0.8)' }}>
              →
            </button>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-110 active:scale-95 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}
        title={`Talk to ${botName}`}>
        {avatarUrl
          ? <img src={avatarUrl} alt={botName} className="w-14 h-14 object-cover" />
          : <span>👾</span>}
      </button>
    </div>
  );
}
