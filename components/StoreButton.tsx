'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCoinReward } from '@/hooks/useCoinReward';

export default function StoreButton() {
  const router = useRouter();
  const { pillBalance, pillPulse, ensureBalanceLoaded } = useCoinReward();

  useEffect(() => {
    ensureBalanceLoaded();
  }, [ensureBalanceLoaded]);

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
          box-shadow: 0 0 16px rgba(192,167,255,0.7);
        }
      `}</style>
      <button
        id="coin-balance-pill"
        onClick={() => router.push('/store')}
        className={`flex items-center justify-center gap-1.5 rounded-full border-none whitespace-nowrap transition-colors${pillPulse ? ' coin-pill-pulse' : ''}`}
        style={{ padding: '5px 12px', background: '#7c3aed' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#6b2fd6'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#7c3aed'; }}
        aria-label="Open store"
        title="Store"
      >
        <i className="ti ti-building-store" style={{ fontSize: '12px', color: '#fff' }} />
        <span style={{ fontSize: '10px', fontWeight: 500, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Store
        </span>
        {pillBalance !== null && (
          <span style={{ fontSize: '10px', fontWeight: 500, color: '#fde68a' }}>
            · {pillBalance}
          </span>
        )}
      </button>
    </>
  );
}
