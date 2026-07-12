'use client';

import { useRef, useEffect } from 'react';

interface ChatPanelProps {
  /** Message content — rendered inside the bottom-anchored scroll area. */
  children: React.ReactNode;
  /** Pinned bottom section (dock, input, action buttons). */
  dock?: React.ReactNode;
  /**
   * Change this value to trigger an auto-scroll to the bottom.
   * Pass `messages.length`, a combined string, etc.
   */
  scrollTrigger?: unknown;
  dir?: 'ltr' | 'rtl';
  /** Extra classes applied to the root element (default: flex-1 flex-col). */
  className?: string;
  /** Extra classes applied to the inner messages wrapper (default: gap-3 py-4). */
  messageClassName?: string;
}

/**
 * Shared structural shell for both the Orin guide panel and the planet voice panel.
 *
 * Layout:
 *  - Scrollable area with a flex spacer that pins messages to the bottom when
 *    there are only a few (the spacer collapses once messages overflow so normal
 *    scroll takes over).
 *  - Optional pinned dock rendered below the scroll area.
 */
export function ChatPanel({
  children,
  dock,
  scrollTrigger,
  dir,
  className = '',
  messageClassName = '',
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scrollTrigger]);

  return (
    <div className={`flex flex-col flex-1 min-h-0 overflow-hidden ${className}`} dir={dir}>
      {/* Bottom-anchored scroll area */}
      <div className="flex-1 overflow-y-auto min-h-0 panel-chat-scroll flex flex-col">
        {/* Spacer: fills free space when messages are few, collapses when they overflow */}
        <div className="flex-1" />
        <div className={`flex flex-col gap-3 py-4 ${messageClassName}`}>
          {children}
        </div>
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {dock && <div className="flex-shrink-0">{dock}</div>}
    </div>
  );
}
