'use client';

// Slide-in drawer showing one student's bot conversation transcript.
// Extracted from the original /admin Family Track Monitor so both the
// Families tab and the Students detail view render chats the same way.
// Fetches `fetchUrl` (any endpoint returning { conversations: Message[] })
// whenever it opens.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  id:             string;
  role:           'user' | 'assistant';
  content:        string;
  screen_context: string | null;
  speaker?:       string | null;
  created_at:     string;
};

type ConversationDrawerProps = {
  open:         boolean;
  title:        string;
  subtitle:     string | null;
  fetchUrl:     string;
  studentLabel: string;          // e.g. 'Child' (families) or the student's name
  onClose:      () => void;
};

function speakerLabel(message: Message, studentLabel: string): string {
  if (message.role === 'user') return studentLabel;
  if (message.speaker && message.speaker !== 'orin') return message.speaker;
  return 'Orin';
}

export default function ConversationDrawer({
  open, title, subtitle, fetchUrl, studentLabel, onClose,
}: ConversationDrawerProps) {
  const [conversations, setConversations] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(fetchUrl)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setConversations(data.conversations ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setConversations([]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, fetchUrl]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-[#0e0b1a] border-l border-white/10 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div>
                <p className="font-medium text-white/80">{title}</p>
                {subtitle && <p className="text-xs text-white/35">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loading ? (
                <p className="text-white/30 text-sm animate-pulse">Loading conversations…</p>
              ) : conversations.length === 0 ? (
                <p className="text-white/30 text-sm">No conversations yet.</p>
              ) : (
                conversations.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl px-4 py-3 text-sm max-w-[90%] ${
                      msg.role === 'user'
                        ? 'bg-white/8 text-white/80 self-end ml-auto'
                        : 'bg-purple-900/30 text-purple-100 border border-purple-500/20'
                    }`}
                    style={{ display: 'block' }}
                  >
                    <p className="text-[10px] tracking-widest uppercase mb-1 opacity-40">
                      {speakerLabel(msg, studentLabel)}{msg.screen_context ? ` · ${msg.screen_context}` : ''}
                    </p>
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] opacity-25 mt-1">
                      {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
