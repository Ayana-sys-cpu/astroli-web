import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParentOnboardingContent from '@/app/parent/onboarding/OnboardingContent';

const hoisted = vi.hoisted(() => ({
  searchParams: new URLSearchParams(''),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: hoisted.push, replace: hoisted.replace }),
  useSearchParams: () => hoisted.searchParams,
}));

const JOURNEY_TITLE = 'What Is Everything Made Of?';

type DashboardStub = {
  familyClass?: unknown;
  setupState?: { step: string };
  consentStatus?: { hasCurrentConsent: boolean; needsReconsent?: boolean };
  pendingInvite?: { childEmail: string } | null;
  child?: { id: string; name: string | null; email: string | null } | null;
};

function stubFetch(dashboard: DashboardStub) {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.startsWith('/api/parent/dashboard')) {
      return { ok: true, json: async () => ({ familyClass: null, pendingInvite: null, child: null, ...dashboard }) };
    }
    if (u.startsWith('/api/parent/consent')) {
      return { ok: true, json: async () => ({ ok: true, consentId: 'consent-1', policyVersion: 'v1' }) };
    }
    if (u.startsWith('/api/parent/child-invite')) {
      return { ok: true, json: async () => ({ ok: true, inviteId: 'invite-1' }) };
    }
    if (u.startsWith('/api/parent/journeys/catalog')) {
      return {
        ok: true,
        json: async () => ({
          journeys: [{ id: 'j1', title: JOURNEY_TITLE, description: 'Matter and atoms', missionCount: 5 }],
        }),
      };
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const calledCatalog = (f: ReturnType<typeof stubFetch>) =>
  f.mock.calls.some(c => String(c[0]).includes('/api/parent/journeys/catalog'));

describe('parent onboarding — email → consent → journey', () => {
  beforeEach(() => {
    hoisted.searchParams = new URLSearchParams('');
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('walks email → consent → sends the invite on the consent click → journey picker', async () => {
    const fetchMock = stubFetch({ setupState: { step: 'no_child' } });
    const user = userEvent.setup();
    render(<ParentOnboardingContent />);

    // Step 1 of 3 — email only, no name field, nothing sent.
    expect(await screen.findByText("Set up your child's account")).toBeInTheDocument();
    expect(screen.queryByLabelText("Child's name")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Child's Gmail"), 'child@gmail.com');
    await user.click(screen.getByRole('button', { name: /Continue to consent/ }));

    // Step 2 of 3 — consent shows the email as text, button disabled until ticked.
    expect(await screen.findByText('Your consent, as their parent')).toBeInTheDocument();
    expect(screen.getByText('child@gmail.com')).toBeInTheDocument();
    const consentButton = screen.getByRole('button', { name: /I consent — send invite/ });
    expect(consentButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(consentButton).toBeEnabled();
    await user.click(consentButton);

    // The consent click records consent AND dispatches the invite — no name sent.
    const inviteCall = fetchMock.mock.calls.find(c => String(c[0]) === '/api/parent/child-invite');
    expect(inviteCall).toBeTruthy();
    expect(JSON.parse((inviteCall![1] as RequestInit).body as string)).toEqual({ childEmail: 'child@gmail.com' });

    // Step 3 of 3 — picker with the invite-sent banner; journeys actually load.
    expect(await screen.findByText('Choose a learning journey')).toBeInTheDocument();
    expect(screen.getByText(/Invite sent to child@gmail.com/)).toBeInTheDocument();
    expect(await screen.findByText(JOURNEY_TITLE)).toBeInTheDocument();
    expect(calledCatalog(fetchMock)).toBe(true);
  });

  it('loads journeys when the child has already accepted and only the journey is missing', async () => {
    const fetchMock = stubFetch({
      setupState: { step: 'no_journey' },
      child: { id: 'c1', name: 'Noa', email: 'noa@gmail.com' },
    });
    render(<ParentOnboardingContent />);

    expect(await screen.findByText('Choose a learning journey')).toBeInTheDocument();
    // Child already accepted — no invite banner.
    expect(screen.queryByText(/Invite sent to/)).not.toBeInTheDocument();
    expect(await screen.findByText(JOURNEY_TITLE)).toBeInTheDocument();
    expect(calledCatalog(fetchMock)).toBe(true);
  });

  it('returns a parent with a pending invite straight to the picker with the banner', async () => {
    stubFetch({
      setupState: { step: 'no_child' },
      consentStatus: { hasCurrentConsent: true },
      pendingInvite: { childEmail: 'child@gmail.com' },
    });
    render(<ParentOnboardingContent />);

    expect(await screen.findByText('Choose a learning journey')).toBeInTheDocument();
    expect(screen.getByText(/Invite sent to child@gmail.com/)).toBeInTheDocument();
  });

  it('shows the preview tour to a brand-new parent, then continues into Step 1', async () => {
    stubFetch({
      setupState: { step: 'no_child' },
      consentStatus: { hasCurrentConsent: false },
    });
    const user = userEvent.setup();
    render(<ParentOnboardingContent />);

    // Tour first (brand-new parent, nothing set up yet).
    expect(await screen.findByText('Multiple planets, one big idea')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Skip' }));

    // Skipping lands on Step 1 and remembers the tour was seen.
    expect(await screen.findByText("Set up your child's account")).toBeInTheDocument();
    expect(localStorage.getItem('astroli_parent_tour_seen')).toBe('1');
  });
});
