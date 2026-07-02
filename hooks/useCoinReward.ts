import { createContext, useContext } from 'react';
import type { EventType } from '@/lib/coin-service';

export interface CoinRewardResult {
  awarded:           boolean;
  amount:            number;
  newBalance:        number;
  eventType:         EventType;
  titleOverride?:    string;
  subtitleOverride?: string;
  onDismiss?:        () => void;
}

interface CoinRewardContextValue {
  triggerReward: (result: CoinRewardResult) => void;
  balance: number | null;
  setBalance: (balance: number) => void;
}

export const CoinRewardContext = createContext<CoinRewardContextValue | null>(null);

export function useCoinReward(): CoinRewardContextValue {
  const ctx = useContext(CoinRewardContext);
  if (!ctx) throw new Error('useCoinReward must be used inside <CoinRewardProvider>');
  return ctx;
}
