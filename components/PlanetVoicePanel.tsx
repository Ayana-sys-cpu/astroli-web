'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type PlanetCharacter, type PlanetVoiceMessage } from '@/lib/usePlanetVoice';

interface Props {
  character: PlanetCharacter;
  messages: PlanetVoiceMessage[];
  input: string;
  setInput: (v: string) => void;
  send: () => void;
  loading: boolean;
  thinking: boolean;
  studentFirstName?: string;
  missionTitle?: string;
}

export default function PlanetVoicePanel({
  character, messages, input, setInput, send, loading, thinking,
  studentFirstName, missionTitle,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !loading) send();
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel header */}
      <div className="px-4 py-2.5 border-b border-white/5 flex-shrink-0">
        <p className="text-[10px] tracking-[0.2em] text-white/35 font-space uppercase">
          {character.name} · {character.era}
        </p>
        <p className="text-[9px] text-white/20 font-space mt-0.5">
          {character.location}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 && (() => {
          const name = studentFirstName ?? 'Explorer';
          const mission = missionTitle ?? 'this mission';
          const prefill = `Hello, I'm ${name}. I'm on a mission to uncover "${mission}" and I'd love your help. Tell me a little about yourself and how you connect to it.`;
          return (
            <div className="flex flex-col items-center gap-4 mt-8 px-2">
              <p className="text-[10px] text-white/25 font-space text-center tracking-[0.15em] uppercase">
                Start the conversation
              </p>
              <button
                onClick={() => { setInput(prefill); }}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-[#9b8fd4]/20 bg-[#9b8fd4]/5 hover:bg-[#9b8fd4]/10 hover:border-[#9b8fd4]/35 transition-all group"
              >
                <p className="text-[11px] font-inter text-white/50 group-hover:text-white/70 leading-relaxed transition-colors">
                  {prefill}
                </p>
                <p className="text-[9px] tracking-[0.2em] font-space text-[#9b8fd4]/50 group-hover:text-[#9b8fd4]/80 mt-2 transition-colors uppercase">
                  Send &amp; Uncover →
                </p>
              </button>
            </div>
          );
        })()}

        {messages.map(msg => {
          if (msg.speaker === 'student') {
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                <div className="max-w-[240px] px-3 py-2 rounded-lg rounded-br-none text-[12px] font-inter leading-relaxed bg-[#00C4CC]/12 border border-[#00C4CC]/20 text-white/80">
                  {msg.content}
                </div>
              </div>
            );
          }

          if (msg.speaker === 'orin') {
            return (
              <div key={msg.id} className="flex flex-col items-start gap-1">
                <span className="text-[9px] tracking-[0.2em] text-[#06D6A0]/60 font-space uppercase">
                  ORIN · GUIDE
                </span>
                <div
                  className="max-w-[240px] px-3 py-2.5 rounded-lg text-[12px] font-inter leading-relaxed border-l-2"
                  style={{ background: 'rgba(6,214,160,0.06)', borderColor: '#06D6A0' }}
                >
                  <p className="text-white/70">{msg.content}</p>
                </div>
              </div>
            );
          }

          // figure
          return (
            <div key={msg.id} className="flex flex-col items-start gap-1">
              <span className="text-[9px] tracking-[0.2em] text-[#9b8fd4]/60 font-space uppercase">
                {character.name.split(' ')[0].toUpperCase()}
              </span>
              <div className="max-w-[240px] px-3 py-2.5 rounded-lg rounded-bl-none text-[12px] font-inter leading-relaxed bg-white/5 border border-white/8 text-white/70">
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Thinking dots */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/8 bg-white/3 w-fit"
            >
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: thinking ? 'rgba(155,143,212,0.7)' : 'rgba(0,196,204,0.6)' }}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/5 flex gap-2 flex-shrink-0">
        <input
          className="input-dark text-xs flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
          placeholder={loading ? `${character.name.split(' ')[0]} is thinking...` : `Ask ${character.name.split(' ')[0]}...`}
          value={input}
          disabled={loading}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="text-[#9b8fd4]/60 hover:text-[#9b8fd4] disabled:opacity-30 transition-colors text-sm px-1"
        >
          →
        </button>
      </div>
    </div>
  );
}
