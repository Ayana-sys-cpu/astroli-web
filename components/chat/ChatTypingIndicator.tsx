'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { ChatSpeakerTheme } from './chat-themes';
import { CharacterMessageRow } from './CharacterMessageRow';

/** Avatar + bubble with three pulsing dots, shown while a character is "typing". */
export function ChatTypingIndicator({ speaker, avatar }: {
  speaker: ChatSpeakerTheme;
  /** Replaces the themed orb (e.g. a student-chosen avatar image). */
  avatar?: ReactNode;
}) {
  return (
    <CharacterMessageRow speaker={speaker} avatar={avatar}>
      <div style={{
        background: speaker.bubble.background,
        border: `1px solid ${speaker.bubble.borderColor}`,
        borderRadius: '4px 14px 14px 14px', padding: '10px 14px',
      }}>
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              style={{ width: 6, height: 6, borderRadius: '50%', background: speaker.bubble.accentColor, display: 'block' }}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </CharacterMessageRow>
  );
}
