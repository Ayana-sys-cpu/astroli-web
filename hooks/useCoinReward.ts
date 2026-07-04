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
  /** Rect of the element the reward should visually emerge from (e.g. the chat panel).
   *  Undefined falls back to the modal's default center-materialize entrance. */
  sourceRect?:       DOMRect;
}

interface CoinRewardContextValue {
  triggerReward: (result: CoinRewardResult) => void;
  balance: number | null;
  setBalance: (balance: number) => void;
  /** Value the balance pill should display. Updates the instant a reward is awarded,
   *  independent of whether the student clicks "Claim" — the claim/burst flow only
   *  replays a count-up animation over an already-correct value, it never gates it. */
  pillBalance: number | null;
  /** True while the balance pill should play its shake/scale/glow reaction. */
  pillPulse: boolean;
}

export const CoinRewardContext = createContext<CoinRewardContextValue | null>(null);

export function useCoinReward(): CoinRewardContextValue {
  const ctx = useContext(CoinRewardContext);
  if (!ctx) throw new Error('useCoinReward must be used inside <CoinRewardProvider>');
  return ctx;
}
