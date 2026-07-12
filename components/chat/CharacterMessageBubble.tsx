'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { ChatSpeakerTheme } from './chat-themes';
import { CharacterMessageRow } from './CharacterMessageRow';

/**
 * Text bubble for a non-student speaker: orb + rounded bubble with an
 * optional uppercase name label. Content is either trusted, pre-escaped
 * `html` (scripted mission text) or plain React children.
 */
export function CharacterMessageBubble({ speaker, label, html, children, maxWidth, fill, isRtl, avatar }: {
  speaker: ChatSpeakerTheme;
  /** Uppercase speaker name shown above the text (e.g. figure name, 'ORIN · GUIDE'). */
  label?: string;
  /** Trusted HTML — caller must sanitize/escape any student-typed or model-generated text. */
  html?: string;
  children?: ReactNode;
  maxWidth?: string;
  /** Stretch the bubble to fill the row width. */
  fill?: boolean;
  isRtl?: boolean;
  /** Replaces the themed orb (e.g. a student-chosen avatar image). */
  avatar?: ReactNode;
}) {
  const textStyle: CSSProperties = {
    fontSize: 13, lineHeight: 1.68, color: speaker.bubble.textColor, margin: 0,
    ...(isRtl && { direction: 'rtl', textAlign: 'right' }),
  };

  return (
    <CharacterMessageRow speaker={speaker} avatar={avatar}>
      <div style={{
        background: speaker.bubble.background,
        border: `1px solid ${speaker.bubble.borderColor}`,
        ...(speaker.bubble.leftEdgeColor && { borderLeft: `2px solid ${speaker.bubble.leftEdgeColor}` }),
        ...(speaker.bubble.glow && { boxShadow: speaker.bubble.glow }),
        borderRadius: '4px 14px 14px 14px', padding: '12px 14px',
        ...(maxWidth && { maxWidth }),
        ...(fill && { flex: 1 }),
      }}>
        {label && (
          <div style={{
            fontSize: 11, fontWeight: 800, color: speaker.bubble.accentColor,
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 5,
          }}>
            {label}
          </div>
        )}
        {html !== undefined
          ? <p style={textStyle} dangerouslySetInnerHTML={{ __html: html }} />
          : <p style={textStyle}>{children}</p>}
      </div>
    </CharacterMessageRow>
  );
}
