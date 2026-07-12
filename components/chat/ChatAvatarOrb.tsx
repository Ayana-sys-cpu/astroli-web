'use client';

import type { ChatOrbTheme } from './chat-themes';

/** Glowing avatar orb shown next to every character message. */
export function ChatAvatarOrb({ theme, size = 24 }: { theme: ChatOrbTheme; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: theme.gradient,
      border: `1px solid ${theme.borderColor}`,
      ...(theme.glowColor && { boxShadow: `0 0 ${size * 0.6}px ${theme.glowColor}` }),
      ...(theme.pulseAnimation && { animation: theme.pulseAnimation }),
    }} />
  );
}
