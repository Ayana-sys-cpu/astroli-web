'use client';
import { useState, useCallback } from 'react';
import { CoinRewardContext } from '@/hooks/useCoinReward';
import CoinRewardModal from './CoinRewardModal';
import type { CoinRewardResult } from '@/hooks/useCoinReward';

export default function CoinRewardProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<CoinRewardResult[]>([]);

  const triggerReward = useCallback((result: CoinRewardResult) => {
    if (!result.awarded) return;
    setQueue(prev => [...prev, result]);
  }, []);

  function dismiss() {
    const dismissed = queue[0];
    setQueue(prev => prev.slice(1));
    dismissed?.onDismiss?.();
  }

  const current = queue[0] ?? null;

  return (
    <CoinRewardContext.Provider value={{ triggerReward }}>
      <div style={{ position: 'relative', minHeight: '100dvh' }}>
        {children}
        {current && <CoinRewardModal reward={current} onDismiss={dismiss} />}
      </div>
    </CoinRewardContext.Provider>
  );
}
