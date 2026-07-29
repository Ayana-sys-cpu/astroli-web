import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentHeader from '@/components/StudentHeader';
import CoinRewardProvider from '@/components/CoinRewardProvider';
import { resolveStoreOrigin } from '@/lib/store-origin';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function renderHeader(props: Parameters<typeof StudentHeader>[0] = {}) {
  return render(
    <CoinRewardProvider>
      <StudentHeader {...props} />
    </CoinRewardProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  window.localStorage.clear();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ balance: 140 }),
  }) as unknown as typeof fetch;
});

describe('StudentHeader — nav mode (top-level screens)', () => {
  it('renders both pillar links with the current one marked active, and no back pill', () => {
    renderHeader({ nav: 'master' });

    const master = screen.getByRole('button', { name: 'Master' });
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(master).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button', { name: /←/ })).not.toBeInTheDocument();
  });

  it('makes Master reachable from a top-level screen in one tap', async () => {
    renderHeader({ nav: 'home' });

    await userEvent.click(screen.getByRole('button', { name: 'Master' }));
    expect(push).toHaveBeenCalledWith('/master');
  });
});

describe('StudentHeader — back mode (deep screens)', () => {
  it('renders one labelled back pill instead of the nav links', () => {
    renderHeader({ back: { label: 'backMissionMap', href: '/landscape?classId=abc' } });

    expect(screen.getByRole('button', { name: '← Mission map' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Master' })).not.toBeInTheDocument();
  });

  it('navigates to the back destination', async () => {
    renderHeader({ back: { label: 'backPlanet', href: '/landscape/planet-7' } });

    await userEvent.click(screen.getByRole('button', { name: '← Planet' }));
    expect(push).toHaveBeenCalledWith('/landscape/planet-7');
  });

  it('shows the back pill when both nav and back are supplied', () => {
    renderHeader({ nav: 'home', back: { label: 'backHome', href: '/home' } });

    expect(screen.getByRole('button', { name: '← Home' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Master' })).not.toBeInTheDocument();
  });
});

describe('StudentHeader — store pill modes', () => {
  it('shows the word Store on top-level screens', async () => {
    renderHeader({ nav: 'home', store: 'full' });
    await waitFor(() => expect(screen.getByText('140')).toBeInTheDocument());

    expect(screen.getByText('Store')).toBeInTheDocument();
  });

  it('drops the word Store on deep screens so the back pill fits', async () => {
    renderHeader({ back: { label: 'backMissionMap', href: '/landscape' }, store: 'compact' });
    await waitFor(() => expect(screen.getByText('140')).toBeInTheDocument());

    expect(screen.queryByText('Store')).not.toBeInTheDocument();
  });

  it('renders the balance as a readout, not a link, on the store itself', async () => {
    renderHeader({ back: { label: 'backHome', href: '/home' }, store: 'readonly' });
    await waitFor(() => expect(screen.getByText('140')).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: 'Open store' })).not.toBeInTheDocument();
    expect(document.getElementById('coin-balance-pill')?.tagName).toBe('SPAN');
    // The page already carries a "Store" context label — don't say it twice.
    expect(screen.queryByText('Store')).not.toBeInTheDocument();
  });

  it('renders no pill at all when hidden', async () => {
    renderHeader({ back: { label: 'backHome', href: '/home' }, store: 'hidden' });

    await waitFor(() => expect(screen.getByLabelText('Account menu')).toBeInTheDocument());
    expect(document.getElementById('coin-balance-pill')).toBeNull();
  });

  it('keeps id="coin-balance-pill" on the balance element — the coin burst aims at it', async () => {
    renderHeader({ nav: 'home', store: 'full' });

    await waitFor(() => expect(document.getElementById('coin-balance-pill')).not.toBeNull());
  });

  it('carries the origin path and label to the store', async () => {
    window.history.replaceState({}, '', '/landscape?classId=abc');
    renderHeader({
      back: { label: 'backHome', href: '/home' },
      store: 'compact',
      storeOriginLabel: 'backMissionMap',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Open store' }));
    expect(push).toHaveBeenCalledWith(
      `/store?from=${encodeURIComponent('/landscape?classId=abc')}&label=backMissionMap&lang=en`,
    );
  });
});

describe('StudentHeader — student identity', () => {
  it('uses the initial supplied by the page', () => {
    renderHeader({ nav: 'home', initials: 'R' });
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('falls back to the local-storage first name — never the dev mock "DS"', async () => {
    window.localStorage.setItem('astroli_first_name', 'Roni');
    renderHeader({ nav: 'home' });

    await waitFor(() => expect(screen.getByText('R')).toBeInTheDocument());
    expect(screen.queryByText('DS')).not.toBeInTheDocument();
  });

  it('falls back to A when no name is cached', async () => {
    renderHeader({ nav: 'home' });
    await waitFor(() => expect(screen.getByText('T')).toBeInTheDocument()); // "Traveler"
  });
});

describe('StudentHeader — language', () => {
  it('renders every header string in Hebrew for a Hebrew-class student', async () => {
    renderHeader({ back: { label: 'backMissionMap', href: '/landscape' }, store: 'full', lang: 'he' });

    expect(screen.getByRole('button', { name: '← מפת המשימה' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('חנות')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Account menu'));
    expect(screen.getByText('התנתקות')).toBeInTheDocument();
  });
});

describe('resolveStoreOrigin — the back control cannot be pointed off-platform', () => {
  it('accepts an internal path with a known label', () => {
    expect(resolveStoreOrigin({ from: '/landscape/planet-7', label: 'backPlanet', lang: 'he' }))
      .toEqual({ href: '/landscape/planet-7', label: 'backPlanet', lang: 'he' });
  });

  it.each([
    ['a protocol-relative host', '//evil.com'],
    ['an absolute URL', 'https://evil.com'],
    ['a backslash variant', '/\\evil.com'],
    ['a bare host', 'evil.com'],
  ])('rejects %s and falls back to Home', (_label, from) => {
    expect(resolveStoreOrigin({ from, label: 'backPlanet', lang: 'en' }))
      .toEqual({ href: '/home', label: 'backHome', lang: 'en' });
  });

  it('falls back to Home when the label is unknown, so the label never lies about the destination', () => {
    expect(resolveStoreOrigin({ from: '/landscape', label: 'backMordor', lang: 'en' }))
      .toEqual({ href: '/home', label: 'backHome', lang: 'en' });
  });

  it('defaults a missing or invalid language to English', () => {
    expect(resolveStoreOrigin({ from: null, label: null, lang: null }).lang).toBe('en');
    expect(resolveStoreOrigin({ from: null, label: null, lang: 'fr' }).lang).toBe('en');
  });
});
