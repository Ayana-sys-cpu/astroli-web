// src/astroli-web/__tests__/hooks/usePlanetVoice.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlanetVoice } from '@/hooks/usePlanetVoice';

vi.mock('@/lib/session', () => ({
  getSessionToken: vi.fn().mockResolvedValue('session-token-1'),
}));

function mockFetchSequence(charData: unknown, histData: unknown) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/character')) return Promise.resolve({ json: () => Promise.resolve(charData) });
    if (url.includes('/history'))   return Promise.resolve({ json: () => Promise.resolve(histData) });
    return Promise.reject(new Error(`unexpected fetch ${url}`));
  }));
}

const CHAR_DATA = { character: { id: 'c1', planet_id: 'planet-1', name: 'Figure' } };

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('usePlanetVoice — restoring completion state on reopen (history load)', () => {
  it('sets completionReady, completionType, and summaryInsights from the history response without sending a message', async () => {
    mockFetchSequence(CHAR_DATA, {
      messages: [],
      totalGoals: 3,
      initialPerkinsMap: { g1: 2, g2: 3, g3: 4 },
      completed: false,
      completionType: 'standard',
      completionReady: true,
      summaryInsights: [{ goalSlug: 'goal-1', insightText: 'Insight text', evidence: 'quote' }],
    });

    const { result } = renderHook(() => usePlanetVoice('planet-1', 'en'));

    await waitFor(() => expect(result.current.charLoading).toBe(false));

    expect(result.current.completionReady).toBe(true);
    expect(result.current.completionType).toBe('standard');
    expect(result.current.summaryInsights).toEqual([
      { goalSlug: 'goal-1', insightText: 'Insight text', evidence: 'quote' },
    ]);
  });

  it('leaves completionReady false when the history response says the planet is not ready yet', async () => {
    mockFetchSequence(CHAR_DATA, {
      messages: [],
      totalGoals: 3,
      initialPerkinsMap: { g1: 2 },
      completed: false,
      completionType: null,
      completionReady: false,
      summaryInsights: [],
    });

    const { result } = renderHook(() => usePlanetVoice('planet-1', 'en'));

    await waitFor(() => expect(result.current.charLoading).toBe(false));

    expect(result.current.completionReady).toBe(false);
    expect(result.current.summaryInsights).toEqual([]);
  });
});
