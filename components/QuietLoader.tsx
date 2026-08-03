'use client';

/**
 * The platform's quiet loader — three softly pulsing dots, no drama. For any
 * in-screen wait that isn't a full "mission prep" / "journey prep" moment
 * (those keep ConstellationLoader). Drop it inline wherever content is on its
 * way; it reads as a breath, not an event.
 */
export default function QuietLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-6" role="status" aria-label={label ?? 'Loading'}>
      <span className="quiet-dot" />
      <span className="quiet-dot" style={{ animationDelay: '0.2s' }} />
      <span className="quiet-dot" style={{ animationDelay: '0.4s' }} />
      {label && (
        <span className="ml-2 text-[12px]" style={{ color: 'var(--master-text-muted, #9ca3af)' }}>
          {label}
        </span>
      )}

      <style>{`
        .quiet-dot {
          width: 5px;
          height: 5px;
          border-radius: 9999px;
          background: #A855F7;
          animation: quiet-dot-pulse 1.2s ease-in-out infinite;
        }
        @keyframes quiet-dot-pulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
}
