'use client';

import type { ReactNode } from 'react';
import type { ChatSpeakerTheme } from './chat-themes';
import { ChatAvatarOrb } from './ChatAvatarOrb';

/**
 * Left-aligned chat row: avatar + arbitrary content. Renders the speaker's
 * themed orb unless `avatar` overrides it (e.g. a student-chosen avatar image).
 * Used directly for card-type messages (mission card, how-to);
 * CharacterMessageBubble builds on it for plain text bubbles.
 */
export function CharacterMessageRow({ speaker, orbSize = 24, avatar, children }: {
  speaker: ChatSpeakerTheme;
  orbSize?: number;
  avatar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 px-4">
      {avatar ?? <ChatAvatarOrb theme={speaker.orb} size={orbSize} />}
      {children}
    </div>
  );
}
