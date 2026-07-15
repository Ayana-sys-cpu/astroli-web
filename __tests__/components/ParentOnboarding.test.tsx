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

/**
 * @param setupStep what GET /api/parent/dashboard reports. 'no_child' is a parent
 *   who has sent an invite their child has not accepted yet — accepting is what
 *   creates the parent_child_link the API keys this off.
 */
function stubFetch(setupStep: 'no_child' | 'no_journey') {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.startsWith('/api/parent/dashboard')) {
      return { ok: true, json: async () => ({ familyClass: null, setupState: { step: setupStep } }) };
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

describe('parent onboarding — journey picker', () => {
  beforeEach(() => {
    hoisted.searchParams = new URLSearchParams('');
    vi.clearAllMocks();
  });

  it('loads journeys after sending an invite, before the child has accepted', async () => {
    const fetchMock = stubFetch('no_child');
    const user = userEvent.setup();
    render(<ParentOnboardingContent />);

    // Step 1 — send the invite.
    expect(await screen.findByText("Set up your child's account")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Child's name"), 'Test');
    await user.type(screen.getByLabelText("Child's Gmail"), 'child@gmail.com');
    await user.click(screen.getByRole('button', { name: /Send Invite/ }));

    // Step 2 — advance to the picker the way the UI does it.
    await user.click(await screen.findByRole('button', { name: /Continue — choose a journey/ }));
    expect(await screen.findByText('Choose a learning journey')).toBeInTheDocument();

    // The picker must actually fetch and render journeys, not sit on skeletons.
    expect(await screen.findByText(JOURNEY_TITLE)).toBeInTheDocument();
    expect(calledCatalog(fetchMock)).toBe(true);
  });

  it('loads journeys when the child has already accepted and only the journey is missing', async () => {
    const fetchMock = stubFetch('no_journey');
    render(<ParentOnboardingContent />);

    expect(await screen.findByText('Choose a learning journey')).toBeInTheDocument();
    expect(await screen.findByText(JOURNEY_TITLE)).toBeInTheDocument();
    expect(calledCatalog(fetchMock)).toBe(true);
  });
});
