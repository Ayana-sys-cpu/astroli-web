'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Orin's words arrive word by word, so a reveal reads like a reveal instead of
 * a wall of text landing at once. Only newly-arrived messages animate — history
 * renders instantly on reload.
 */
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
  const words = useRef(text.split(' '));
  const [shown, setShown] = useState(animate ? 0 : words.current.length);

  useEffect(() => {
    if (!animate || shown >= words.current.length) return;
    const id = setInterval(() => {
      setShown((s) => {
        const next = Math.min(s + 2, words.current.length);
        if (next >= words.current.length) clearInterval(id);
        return next;
      });
      onGrow?.();
    }, 60);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate]);

  return <>{words.current.slice(0, shown).join(' ')}</>;
}
