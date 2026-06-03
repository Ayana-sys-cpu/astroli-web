'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getBotName, loadStudent } from '@/lib/student-store';
import { getSessionStudentId } from '@/lib/session';

const BOT_URL     = 'https://astorli-bot.vercel.app/api/bot';
const OPENING_URL = 'https://astorli-bot.vercel.app/api/opening-message';
const FALLBACK_ID = '00000000-0000-0000-0000-000000000001';

const teal    = '#00d4d4';
const tealDim = 'rgba(0,212,212,0.10)';
const tealBdr = 'rgba(0,212,212,0.25)';

function TealOrb({ size = 40 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'radial-gradient(circle at 35% 35%, #4efff0, #00b8a9 50%, #006e66)',
      border: '1px solid rgba(0,212,212,0.5)',
      boxShadow: `0 0 ${size * 0.4}px rgba(0,212,212,0.4)`,
    }} />
  );
}

function screenFromPath(pathname: string): string {
  if (pathname.startsWith('/onboarding'))   return 'onboarding';
  if (pathname.startsWith('/landscape'))    return 'planet_screen';
  if (pathname.startsWith('/mission'))      return 'mission_landscape_hub';
  return 'mission_landscape_hub';
}

// Derive content type + ID from the URL so the floating bot can load opening messages.
// landscape/[id] → planet  |  mission/[id] → mission (ID extracted from URL segment)
function contentFromPath(pathname: string): { contentType: 'mission' | 'planet'; contentId: string } | null {
  const planetMatch = pathname.match(/^\/landscape\/([^/]+)/);
  if (planetMatch) return { contentType: 'planet', contentId: planetMatch[1] };

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
    setAvatarUrl(loadStudent()?.baseAvatarUrl ?? null);
  }, []);

  const screen  = screenFromPath(pathname);
  const content = contentFromPath(pathname);

  // When the panel opens for the first time on a mission/planet screen,
  // fetch Pip's opening message from the shared bot API.
  useEffect(() => {
    if (!open || !content || openingFetched.current) return;
    openingFetched.current = true;

    const { contentType, contentId } = content;
    getSessionStudentId().then(id => {
      const studentId = id ?? FALLBACK_ID;
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
    });
  }, [open, content]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const studentId = (await getSessionStudentId()) ?? FALLBACK_ID;

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
          currentPlanet:  content?.contentType === 'planet'  ? content.contentId : undefined,
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
        <div
          className="w-[380px] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(0,212,212,0.25)', backdropFilter: 'blur(12px)' }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <TealOrb size={40} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: teal,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {botName}
              </div>
              <div style={{
                fontSize: 11, color: '#666',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Your Alien Scout
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: '#888', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages — scrollable */}
          <div className="flex flex-col gap-3 overflow-y-auto max-h-72 min-h-28" style={{ padding: '12px 0' }}>
            {messages.length === 0 && (
              <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Tap to sync with your alien companion...
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === 'user' ? (
                  /* Student bubble — right-aligned */
                  <div className="flex justify-end" style={{ padding: '0 16px' }}>
                    <div style={{
                      background: tealDim, border: `1.5px solid ${tealBdr}`,
                      borderRadius: '14px 4px 14px 14px',
                      padding: '10px 14px', maxWidth: '85%',
                    }}>
                      <p style={{ fontSize: 13, color: teal, margin: 0, lineHeight: 1.6 }}>
                        {m.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Bot bubble — left-aligned with orb + name label */
                  <div>
                    <div className="flex items-start gap-2" style={{ padding: '0 16px' }}>
                      <TealOrb size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 9, fontWeight: 800, color: teal,
                          textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4,
                        }}>
                          {botName.toUpperCase()}
                        </div>
                        <div style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '4px 14px 14px 14px',
                          padding: '10px 14px',
                        }}>
                          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                            {m.content}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick replies — only on last assistant message, only when not loading */}
                    {i === messages.length - 1 && !loading && m.quickReplies && m.quickReplies.length > 0 && (
                      <div className="flex flex-col gap-2" style={{ padding: '8px 16px 0' }}>
                        {m.quickReplies.map((qr, qi) => (
                          <button
                            key={qi}
                            onClick={() => send(qr.value)}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                              padding: '11px 14px', borderRadius: 12,
                              background: 'rgba(0,212,212,0.06)',
                              border: '1px solid rgba(0,212,212,0.2)',
                              textAlign: 'left', cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,212,0.12)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,212,0.06)'; }}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: 'rgba(0,212,212,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, color: teal,
                            }}>
                              ✦
                            </div>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: teal }}>
                              {qr.label}
                            </span>
                            <span style={{ color: teal, fontSize: 15, flexShrink: 0 }}>→</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2" style={{ padding: '0 16px' }}>
                <TealOrb size={28} />
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '4px 14px 14px 14px',
                  padding: '10px 14px',
                }}>
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: teal, opacity: 0.4,
                        animation: `pulse 1.1s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input dock */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', flexShrink: 0 }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '4px 4px 4px 14px',
            }}>
              <input
                className="flex-1 text-white outline-none"
                style={{
                  background: 'none', border: 'none', fontSize: 13,
                  // @ts-ignore
                  caretColor: teal,
                }}
                placeholder={`Ask ${botName}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                style={{
                  padding: '9px 14px', borderRadius: 8, border: 'none', flexShrink: 0,
                  cursor: (!loading && input.trim()) ? 'pointer' : 'default',
                  background: (!loading && input.trim()) ? teal : 'rgba(255,255,255,0.06)',
                  color: (!loading && input.trim()) ? '#000' : '#555',
                  fontSize: 13, fontWeight: 800, transition: 'all 0.15s',
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-110 active:scale-95 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#00b8a9,#006e66)', boxShadow: '0 0 20px rgba(0,212,212,0.5)' }}
        title={`Talk to ${botName}`}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt={botName} className="w-14 h-14 object-cover" />
          : <span>👾</span>}
      </button>
    </div>
  );
}
