'use client';
import { useEffect, useState } from 'react';
import type { LaunchpadTier } from '@/lib/spotlight-ranking';

export interface LaunchpadCard {
  id: string;
  hook: string;
  tier: LaunchpadTier;
}

/** What each tier is called on the card, and the colour that carries it. */
const TIER_LABEL: Record<LaunchpadTier, { text: string; color: string }> = {
  active: { text: 'WHERE YOU ARE', color: 'var(--color-teal)' },
  upcoming: { text: 'COMING UP', color: 'var(--master-purple-orin)' },
  completed: { text: 'YOU FINISHED THIS', color: 'var(--master-text-muted)' },
  detour: { text: 'WORTH A DETOUR', color: 'var(--master-magenta-text)' },
};

interface LaunchpadProps {
  /** Starts a dive from the tapped edit — the same path a saved tile uses. */
  onOpen: (editId: string) => void;
  busy?: boolean;
}

/**
 * What a student sees on Master before they have saved anything.
 *
 * The old empty state explained saving and then sent them to the feed — every
 * word pointing away from the search bar sitting right above it. These cards
 * point the other way: tap one and the dive starts here.
 */
export default function Launchpad({ onOpen, busy = false }: LaunchpadProps) {
  const [cards, setCards] = useState<LaunchpadCard[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/master/launchpad');
        if (!res.ok) { setCards([]); return; }
        const data = await res.json();
        setCards(data.cards ?? []);
      } catch {
        // Absence, not an error — the search bar carries the screen alone.
        setCards([]);
      }
    })();
  }, []);

  return (
    <div className="py-6">
      <p className="text-[17px] text-white" style={{ fontFamily: 'var(--font-space)', fontWeight: 500 }}>
        Ask anything. Or start with one of these.
      </p>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--master-text-muted)' }}>
        Tap one and Orin takes it from there.
      </p>

      {cards === null ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white/[0.04]" style={{ height: 96, borderRadius: 10 }} />
          ))}
        </div>
      ) : cards.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpen(card.id)}
              disabled={busy}
              aria-label={`${TIER_LABEL[card.tier].text}. ${card.hook}`}
              className="rounded-[10px] border p-[13px] text-left transition-colors hover:bg-white/[0.03] disabled:opacity-40"
              style={{ background: 'var(--master-surface)', borderColor: 'var(--master-hairline)' }}
            >
              <span
                className="block text-[10px] tracking-[1.2px]"
                style={{ color: TIER_LABEL[card.tier].color }}
              >
                {TIER_LABEL[card.tier].text}
              </span>
              <span className="mt-[6px] block text-[12.5px] leading-[1.45] text-white">{card.hook}</span>
            </button>
          ))}
        </div>
      ) : null}

      {cards !== null && cards.length > 0 && (
        <p className="mt-4 text-[11px]" style={{ color: 'var(--master-text-muted)' }}>
          Save any dive and it lands here, ready to pick back up.
        </p>
      )}
    </div>
  );
}
