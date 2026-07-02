'use client';
import { useState, useCallback, useEffect } from 'react';
import { CoinRewardContext } from '@/hooks/useCoinReward';
import CoinRewardModal from './CoinRewardModal';
import type { CoinRewardResult } from '@/hooks/useCoinReward';

export default function CoinRewardProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<CoinRewardResult[]>([]);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/store/state')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data: { balance: number }) => setBalance(data.balance))
      .catch(() => {});
  }, []);

  const triggerReward = useCallback((result: CoinRewardResult) => {
    if (!result.awarded) return;
    setBalance(result.newBalance);
    setQueue(prev => [...prev, result]);
  }, []);

  function dismiss() {
    const dismissed = queue[0];
    setQueue(prev => prev.slice(1));
    dismissed?.onDismiss?.();
  }

  const current = queue[0] ?? null;

  return (
    <CoinRewardContext.Provider value={{ triggerReward, balance, setBalance }}>
      <div style={{ position: 'relative', minHeight: '100dvh' }}>
        {children}
        {current && <CoinRewardModal reward={current} onDismiss={dismiss} />}
      </div>
    </CoinRewardContext.Provider>
  );
}
