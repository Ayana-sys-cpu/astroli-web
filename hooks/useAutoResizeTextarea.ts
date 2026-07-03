'use client';

import { useEffect, type RefObject } from 'react';

const MIN_HEIGHT_PX = 20;
const DEFAULT_MAX_HEIGHT_PX = 100;

/**
 * Grows a chat textarea from one line up to maxHeight as its value changes,
 * then lets the browser scroll internally beyond that cap.
 */
export function useAutoResizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  maxHeight: number = DEFAULT_MAX_HEIGHT_PX,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, MIN_HEIGHT_PX), maxHeight)}px`;
  }, [ref, value, maxHeight]);
}
