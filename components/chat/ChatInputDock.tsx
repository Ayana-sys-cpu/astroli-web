'use client';

import { useRef, useState } from 'react';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';
import type { ChatInputTheme } from './chat-themes';

/**
 * Auto-resizing chat textarea + arrow send button. Controlled: the caller
 * owns the value and clears it in `onSend`. Enter sends (Shift+Enter for a
 * newline); the send button stays disabled while empty or `disabled`.
 */
export function ChatInputDock({ value, onChange, onSend, placeholder, theme, disabled = false, isRtl = false }: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  theme: ChatInputTheme;
  disabled?: boolean;
  isRtl?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  useAutoResizeTextarea(textareaRef, value);
  const canSend = !disabled && value.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSend();
    textareaRef.current?.focus();
  };

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-end',
      background: theme.surface,
      border: `1px solid ${focused && theme.focusBorderColor ? theme.focusBorderColor : theme.borderColor}`,
      boxShadow: focused && theme.focusGlow ? theme.focusGlow : 'none',
      borderRadius: 12, padding: '10px 4px 10px 14px',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1, background: 'none', border: 'none', outline: 'none',
          resize: 'none', overflowY: 'auto',
          fontSize: 13, lineHeight: 1.4, color: theme.textColor,
          caretColor: theme.caretColor,
          opacity: disabled ? 0.4 : 1,
          direction: isRtl ? 'rtl' : undefined,
        }}
      />
      <button
        onClick={send}
        disabled={!canSend}
        style={{
          padding: '9px 14px', borderRadius: 8, border: 'none', flexShrink: 0,
          cursor: canSend ? 'pointer' : 'default',
          background: canSend ? theme.sendBackground : theme.sendDisabledBackground,
          color: canSend ? theme.sendTextColor : theme.sendDisabledTextColor,
          fontSize: 13, fontWeight: 800, transition: 'all 0.15s',
        }}
      >
        {isRtl ? '←' : '→'}
      </button>
    </div>
  );
}
