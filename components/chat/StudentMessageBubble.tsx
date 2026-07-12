'use client';

import type { ReactNode } from 'react';
import type { StudentBubbleTheme } from './chat-themes';

/**
 * Right-aligned student message. With `icon` set it renders the compact
 * chip variant used for quick-action taps (e.g. "How to explore").
 */
export function StudentMessageBubble({ theme, icon, isRtl, children }: {
  theme: StudentBubbleTheme;
  icon?: string;
  isRtl?: boolean;
  children: ReactNode;
}) {
  if (icon) {
    return (
      <div className="flex justify-end px-4">
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: theme.background, border: `1.5px solid ${theme.borderColor}`,
          borderRadius: '14px 4px 14px 14px', padding: '9px 14px',
        }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.textColor }}>{children}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end px-4">
      <div style={{
        background: theme.background, border: `1.5px solid ${theme.borderColor}`,
        borderRadius: '14px 4px 14px 14px', padding: '10px 14px', maxWidth: '85%',
      }}>
        <p style={{
          fontSize: 13, color: theme.textColor, margin: 0, lineHeight: 1.6,
          ...(isRtl && { direction: 'rtl', textAlign: 'right' }),
        }}>
          {children}
        </p>
      </div>
    </div>
  );
}
