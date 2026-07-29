'use client';

export interface CuriosityEdit {
  id: string;
  edit_type: 'did_you_know' | 'inspiring_human' | 'real_world_connection';
  hook: string;
  media_url: string;
  media_type: 'image' | 'video';
  media_credit: string;
}

const PILLS: Record<CuriosityEdit['edit_type'], { label: string; color: string }> = {
  did_you_know:           { label: 'DID YOU KNOW', color: '#00E5FF' },
  inspiring_human:        { label: 'INSPIRING',    color: '#C77DFF' },
  real_world_connection:  { label: 'REAL WORLD',   color: '#C77DFF' },
};

interface Props {
  edit: CuriosityEdit;
  ctaLabel: string;
  busy: boolean;
  onExplore: () => void;
}

/** Portrait edit, feed-shaped: cover, scrim, hook, and the way in sitting on it. */
export default function CuriosityEditCard({ edit, ctaLabel, busy, onExplore }: Props) {
  const pill = PILLS[edit.edit_type];

  return (
    // Portrait like the feed, but capped so it never runs past the fold beside the journeys.
    <div
      className="relative w-full overflow-hidden rounded-[9px]"
      style={{ aspectRatio: '9 / 16', maxHeight: '68vh' }}
    >
      {edit.media_type === 'video' ? (
        <video
          src={edit.media_url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={edit.hook}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={edit.media_url}
          alt={edit.hook}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <span
        className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[9px] font-space font-bold uppercase tracking-[0.16em]"
        style={{ color: pill.color, background: 'rgba(0,0,0,0.55)', border: `1px solid ${pill.color}55` }}
      >
        {pill.label}
      </span>

      <span className="absolute right-2.5 top-2.5 text-[8px] text-white/45">{edit.media_credit}</span>

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-3 pt-14"
        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.9) 65%)' }}
      >
        <p
          className="text-[15px] font-semibold leading-snug text-white"
          style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {edit.hook}
        </p>

        <button
          type="button"
          onClick={onExplore}
          disabled={busy}
          className="w-full rounded-full py-2.5 text-[12.5px] font-space font-bold text-white transition-opacity disabled:opacity-50"
          style={{ background: '#8B00FF' }}
        >
          {busy ? '…' : ctaLabel}
        </button>
      </div>
    </div>
  );
}
