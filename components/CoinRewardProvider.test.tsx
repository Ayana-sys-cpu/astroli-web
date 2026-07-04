import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import CoinRewardProvider from './CoinRewardProvider';
import { useCoinReward } from '@/hooks/useCoinReward';
import type { CoinRewardResult } from '@/hooks/useCoinReward';

function TestConsumer({ onReady }: { onReady: (trigger: (r: CoinRewardResult) => void) => void }) {
  const { triggerReward, pillBalance } = useCoinReward();
  onReady(triggerReward);
  return <span data-testid="pill-balance">{pillBalance}</span>;
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ balance: 10 }),
  }) as unknown as typeof fetch;
});

describe('CoinRewardProvider — pill balance updates without requiring a claim click', () => {
  it('updates pillBalance the instant a reward is awarded, before any Claim interaction', async () => {
    let trigger: ((r: CoinRewardResult) => void) | null = null;
    render(
      <CoinRewardProvider>
        <TestConsumer onReady={fn => { trigger = fn; }} />
      </CoinRewardProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('pill-balance').textContent).toBe('10'));

    act(() => {
      trigger!({
        awarded: true,
        amount: 5,
        newBalance: 15,
        eventType: 'goal_completion',
      });
    });

    // No click on "Claim" happened — the pill must already reflect the new balance.
    expect(screen.getByTestId('pill-balance').textContent).toBe('15');
  });
});
