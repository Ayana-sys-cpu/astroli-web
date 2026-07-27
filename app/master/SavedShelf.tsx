'use client';
import { useEffect, useRef, useState } from 'react';

export interface SavedTile {
  id: string;
  kind: 'edit' | 'dive';
  title: string;
  cover_url: string | null;
  has_video: boolean;
  edit_id: string | null;
  dive_session_id: string | null;
  created_at: string;
}

/** Render a window of tiles and grow it as the student scrolls — 100+ saves stay smooth. */
const PAGE = 24;

interface SavedShelfProps {
  saves: SavedTile[];
  onOpen?: (save: SavedTile) => void;
  onRemove: (save: SavedTile) => void;
}

export default function SavedShelf({ saves, onOpen, onRemove }: SavedShelfProps) {
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => { setVisible(PAGE); }, [saves.length]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || visible >= saves.length) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible((n) => n + PAGE);
    }, { root: node.parentElement, rootMargin: '200px' });
    io.observe(node);
    return () => io.disconnect();
  }, [visible, saves.length]);

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
      {saves.slice(0, visible).map((save) => (
        <div
          key={save.id}
          className="group relative shrink-0 snap-start overflow-hidden bg-[#111116]"
          style={{
            width: 132,
            height: 220,
            borderRadius: 'var(--master-tile-radius)',
          }}
        >
          <button
            type="button"
            onClick={() => onOpen?.(save)}
            className="absolute inset-0 w-full h-full text-left"
            aria-label={`Open ${save.title}`}
          >
            {save.cover_url && (
              save.has_video ? (
                // #t=0.1 makes the browser paint a real frame instead of a black box.
                <video
                  src={`${save.cover_url}#t=0.1`}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={save.cover_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              )
            )}
            {/* The clamp lives on a static child — absolute positioning blockifies
                -webkit-box and silently disables line-clamp. */}
            <span
              className="absolute inset-x-0 bottom-0 px-2 pt-6 pb-2"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}
            >
              <span className="master-tile-title text-[11px] font-medium leading-tight text-white">
                {save.title}
              </span>
            </span>
          </button>

          {save.has_video && (
            <span className="pointer-events-none absolute top-1.5 right-2 text-[11px] text-white/85">▶</span>
          )}

          <button
            type="button"
            onClick={() => onRemove(save)}
            className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full bg-black/60 text-white/80 text-[13px] leading-none opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            aria-label={`Remove ${save.title} from Master`}
          >
            ×
          </button>
        </div>
      ))}
      <div ref={sentinel} className="shrink-0 w-px" aria-hidden />
    </div>
  );
}
