'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCoinReward } from '@/hooks/useCoinReward';
import { t, type BackLabelKey, type Lang } from '@/lib/i18n';

/**
 * full     — "Store" + coins + balance, links to /store (top-level screens)
 * compact  — coins + balance only, links to /store (deep screens, where the
 *            back pill already claims the horizontal room)
 * readonly — coins + balance, not a link (on /store itself)
 */
export type StoreButtonMode = 'full' | 'compact' | 'readonly';

interface StoreButtonProps {
  mode?: StoreButtonMode;
  lang?: Lang;
  /** Which back label /store shows when it is reached from here. */
  originLabel?: BackLabelKey;
}

const PILL_BG = 'rgba(0,245,212,0.09)';
const PILL_BG_HOVER = 'rgba(0,245,212,0.16)';
const PILL_BORDER = 'rgba(0,245,212,0.28)';
const TEAL = '#00F5D4';

const PILL_STYLE = {
  padding: '5px 12px',
  background: PILL_BG,
  border: `1px solid ${PILL_BORDER}`,
} as const;

const PILL_CLASS = 'flex items-center gap-2 rounded-full whitespace-nowrap font-space text-xs';

export default function StoreButton({ mode = 'full', lang = 'en', originLabel = 'backHome' }: StoreButtonProps) {
  const router = useRouter();
  const { pillBalance, pillPulse, ensureBalanceLoaded } = useCoinReward();

  useEffect(() => {
    ensureBalanceLoaded();
  }, [ensureBalanceLoaded]);

  // Read at click time rather than through useSearchParams: that hook forces a
  // Suspense boundary onto every page rendering the header, and /home and
  // /pending-journey don't have one.
  const openStore = () => {
    const from = `${window.location.pathname}${window.location.search}`;
    router.push(`/store?from=${encodeURIComponent(from)}&label=${originLabel}&lang=${lang}`);
  };

  const content = (
    <>
      {mode === 'full' && <span style={{ color: TEAL }}>{t('storeLabel', lang)}</span>}
      {pillBalance !== null && (
        <span className="flex items-center gap-1" style={{ color: '#FFFFFF', fontWeight: 500 }}>
          <i className="ti ti-coins" style={{ fontSize: '14px', color: TEAL }} aria-hidden="true" />
          {pillBalance}
        </span>
      )}
    </>
  );

  return (
    <>
      <style>{`
        @keyframes coin-pill-shake {
          0%, 100% { transform: translateX(0) scale(var(--coin-pill-scale, 1)); }
          25%      { transform: translateX(-2px) rotate(-2deg) scale(var(--coin-pill-scale, 1)); }
          75%      { transform: translateX(2px) rotate(2deg) scale(var(--coin-pill-scale, 1)); }
        }
        #coin-balance-pill.coin-pill-pulse {
          --coin-pill-scale: 1.15;
          animation: coin-pill-shake 0.15s ease-in-out 3;
          box-shadow: 0 0 16px rgba(0,245,212,0.55);
        }
      `}</style>

      {mode === 'readonly' ? (
        // Already on /store — the balance is a readout, not a way in.
        <span
          id="coin-balance-pill"
          className={`${PILL_CLASS}${pillPulse ? ' coin-pill-pulse' : ''}`}
          style={PILL_STYLE}
          aria-label={t('coinBalanceAriaLabel', lang)}
        >
          {content}
        </span>
      ) : (
        // The wrapper carries the tap area; the pill keeps its size. The id
        // stays on the pill itself — the coin burst animates toward that box.
        <button
          onClick={openStore}
          className="flex items-center py-[8px] my-[-10px]"
          aria-label={t('storeAriaLabel', lang)}
          title={t('storeLabel', lang)}
        >
          <span
            id="coin-balance-pill"
            className={`${PILL_CLASS} transition-colors${pillPulse ? ' coin-pill-pulse' : ''}`}
            style={PILL_STYLE}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = PILL_BG_HOVER; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = PILL_BG; }}
          >
            {content}
          </span>
        </button>
      )}
    </>
  );
}
