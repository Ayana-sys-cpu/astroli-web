import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import CoinRewardProvider from './CoinRewardProvider';
import StoreButton from './StoreButton';
import { useCoinReward } from '@/hooks/useCoinReward';
import type { CoinRewardResult } from '@/hooks/useCoinReward';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

function TestConsumer({ onReady }: { onReady: (trigger: (r: CoinRewardResult) => void) => void }) {
  const { triggerReward, pillBalance } = useCoinReward();
  onReady(triggerReward);
  return <span data-testid="pill-balance">{pillBalance}</span>;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ balance: 10 }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('CoinRewardProvider — balance loads lazily, only for the pill', () => {
  it('does not fetch the store state on mount (pages without the pill cost zero API calls)', async () => {
    render(
      <CoinRewardProvider>
        <TestConsumer onReady={() => {}} />
      </CoinRewardProvider>,
    );

    // Flush effects — still no request.
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches the balance once when the pill mounts, and never again for later pill mounts', async () => {
    const { rerender } = render(
      <CoinRewardProvider>
        <StoreButton key="home-pill" />
        <TestConsumer onReady={() => {}} />
      </CoinRewardProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('pill-balance').textContent).toBe('10'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Navigate away (pill unmounts) and onto another pill page — the provider
    // survives client-side navigation, so the balance must not be refetched.
    rerender(
      <CoinRewardProvider>
        <TestConsumer onReady={() => {}} />
      </CoinRewardProvider>,
    );
    rerender(
      <CoinRewardProvider>
        <StoreButton key="landscape-pill" />
        <TestConsumer onReady={() => {}} />
      </CoinRewardProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('pill-balance').textContent).toBe('10'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent pill mounts into a single request', async () => {
    render(
      <CoinRewardProvider>
        <StoreButton />
        <StoreButton />
        <TestConsumer onReady={() => {}} />
      </CoinRewardProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('pill-balance').textContent).toBe('10'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('CoinRewardProvider — pill balance updates without requiring a claim click', () => {
  it('updates pillBalance the instant a reward is awarded, before any Claim interaction', async () => {
    let trigger: ((r: CoinRewardResult) => void) | null = null;
    render(
      <CoinRewardProvider>
        <StoreButton />
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

  it('keeps a reward-set balance even if the lazy fetch resolves afterwards with a stale value', async () => {
    let resolveFetch: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise(resolve => { resolveFetch = resolve; }));

    let trigger: ((r: CoinRewardResult) => void) | null = null;
    render(
      <CoinRewardProvider>
        <StoreButton />
        <TestConsumer onReady={fn => { trigger = fn; }} />
      </CoinRewardProvider>,
    );

    // Reward lands while the balance request is still in flight.
    act(() => {
      trigger!({ awarded: true, amount: 5, newBalance: 15, eventType: 'goal_completion' });
    });
    expect(screen.getByTestId('pill-balance').textContent).toBe('15');

    await act(async () => {
      resolveFetch!({ ok: true, json: async () => ({ balance: 10 }) });
    });

    // The stale in-flight response must not clobber the fresher reward balance.
    expect(screen.getByTestId('pill-balance').textContent).toBe('15');
  });
});

describe('CoinRewardProvider — the burst finds the pill', () => {
  // claim() aims the burst at #coin-balance-pill via a raw DOM lookup. If that
  // id ever moves or disappears, the animation silently degrades to an instant
  // dismiss with no error — so assert the aim, not just that claiming works.
  function rewardOf(overrides: Partial<CoinRewardResult> = {}): CoinRewardResult {
    return { awarded: true, amount: 5, newBalance: 15, eventType: 'goal_completion', ...overrides };
  }

  it('animates toward the pill instead of dismissing instantly when the pill is on screen', async () => {
    const onDismiss = vi.fn();
    let trigger: ((r: CoinRewardResult) => void) | null = null;

    render(
      <CoinRewardProvider>
        <StoreButton />
        <TestConsumer onReady={fn => { trigger = fn; }} />
      </CoinRewardProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('pill-balance').textContent).toBe('10'));

    act(() => { trigger!(rewardOf({ onDismiss })); });

    expect(document.getElementById('coin-balance-pill')).not.toBeNull();

    const claim = await screen.findByText('Claim Reward');
    act(() => { claim.click(); });

    // The burst is now flying. Dismissal only happens once it lands, so an
    // immediate onDismiss would mean claim() failed to find its target.
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('falls back to an instant dismiss on a screen with no pill', async () => {
    const onDismiss = vi.fn();
    let trigger: ((r: CoinRewardResult) => void) | null = null;

    render(
      <CoinRewardProvider>
        <TestConsumer onReady={fn => { trigger = fn; }} />
      </CoinRewardProvider>,
    );

    act(() => { trigger!(rewardOf({ onDismiss })); });
    expect(document.getElementById('coin-balance-pill')).toBeNull();

    const claim = await screen.findByText('Claim Reward');
    act(() => { claim.click(); });

    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });

  it('keeps the id on the pill in every visible store mode', async () => {
    for (const mode of ['full', 'compact', 'readonly'] as const) {
      const { unmount } = render(
        <CoinRewardProvider>
          <StoreButton mode={mode} />
        </CoinRewardProvider>,
      );
      await waitFor(() => expect(document.getElementById('coin-balance-pill')).not.toBeNull());
      unmount();
    }
  });
});
