'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CoinRewardContext } from '@/hooks/useCoinReward';
import CoinRewardModal from './CoinRewardModal';
import CoinBurst from './CoinBurst';
import type { CoinRewardResult } from '@/hooks/useCoinReward';

const PILL_PULSE_MS = 550;
const COUNT_UP_MS = 500;

interface Burst {
  from: DOMRect;
  to: DOMRect;
  targetBalance: number;
}

export default function CoinRewardProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<CoinRewardResult[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [pillBalance, setPillBalance] = useState<number | null>(null);
  const [pillPulse, setPillPulse] = useState(false);
  const [burst, setBurst] = useState<Burst | null>(null);
  const pillPulseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/store/state')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data: { balance: number }) => {
        setBalance(data.balance);
        setPillBalance(data.balance);
      })
      .catch(() => {});
  }, []);

  const triggerReward = useCallback((result: CoinRewardResult) => {
    if (!result.awarded) return;
    setBalance(result.newBalance);
    setQueue(prev => [...prev, result]);
  }, []);

  function claim(cardRect: DOMRect) {
    const claimed = queue[0];
    if (!claimed) return;

    const pillEl = document.getElementById('coin-balance-pill');
    const pillRect = pillEl?.getBoundingClientRect();

    if (!pillRect) {
      // No visible target to animate toward (e.g. pill not mounted on this screen) —
      // fall back to the old instant dismiss so claiming still works.
      setPillBalance(claimed.newBalance);
      setQueue(prev => prev.slice(1));
      claimed.onDismiss?.();
      return;
    }

    setBurst({ from: cardRect, to: pillRect, targetBalance: claimed.newBalance });
  }

  function handleBurstArrive() {
    setPillPulse(true);
    if (pillPulseTimeout.current) clearTimeout(pillPulseTimeout.current);
    pillPulseTimeout.current = setTimeout(() => setPillPulse(false), PILL_PULSE_MS);

    setPillBalance(from => {
      const startBalance = from ?? 0;
      const targetBalance = burst?.targetBalance ?? startBalance;
      const startTime = performance.now();

      function tick(now: number) {
        const t = Math.min((now - startTime) / COUNT_UP_MS, 1);
        setPillBalance(Math.round(startBalance + (targetBalance - startBalance) * t));
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);

      return startBalance;
    });
  }

  function handleBurstComplete() {
    setPillBalance(burst?.targetBalance ?? null);
    setBurst(null);

    const dismissed = queue[0];
    setQueue(prev => prev.slice(1));
    dismissed?.onDismiss?.();
  }

  const current = queue[0] ?? null;

  return (
    <CoinRewardContext.Provider value={{ triggerReward, balance, setBalance, pillBalance, pillPulse }}>
      <div style={{ position: 'relative', minHeight: '100dvh' }}>
        {children}
        {current && (
          <CoinRewardModal reward={current} onClaim={claim} claiming={!!burst} />
        )}
        {burst && typeof document !== 'undefined' && createPortal(
          <CoinBurst
            from={burst.from}
            to={burst.to}
            onArrive={handleBurstArrive}
            onComplete={handleBurstComplete}
          />,
          document.body,
        )}
      </div>
    </CoinRewardContext.Provider>
  );
}
