'use client';
import { useEffect, useRef, useState } from 'react';

interface Token {
  word: string;
  highlighted: boolean;
}

/**
 * Orin's words, revealed word by word, with his **marked** names and numbers
 * rendered as teal highlights — the hooks a skimming teen's eye lands on.
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  text.split('**').forEach((part, i) => {
    const highlighted = i % 2 === 1;
    for (const word of part.split(' ')) {
      if (word.length > 0) tokens.push({ word, highlighted });
    }
  });
  return tokens;
}

export default function OrinText({
  text,
  animate,
  onGrow,
}: {
  text: string;
  animate: boolean;
  /** Called as the bubble grows so the chat can keep itself scrolled down. */
  onGrow?: () => void;
}) {
  const tokens = useRef(tokenize(text));
  const [shown, setShown] = useState(animate ? 0 : tokens.current.length);

  useEffect(() => {
    if (!animate || shown >= tokens.current.length) return;
    const id = setInterval(() => {
      setShown((s) => {
        const next = Math.min(s + 2, tokens.current.length);
        if (next >= tokens.current.length) clearInterval(id);
        return next;
      });
      onGrow?.();
    }, 60);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  return (
    <>
      {tokens.current.slice(0, shown).map((t, i) => (
        <span key={i} style={t.highlighted ? { color: '#00F5D4', fontWeight: 600 } : undefined}>
          {t.word}
          {i < shown - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}
