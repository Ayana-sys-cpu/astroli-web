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
    if (u.startsWith('/api/parent/language')) {
      return { ok: true, json: async () => ({ ok: true }) };
    }
    if (u.startsWith('/api/parent/family-class')) {
      return { ok: true, status: 200, json: async () => ({ ok: true, classId: 'class-1' }) };
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

// Language is now the first screen, so tests that exercise later steps have to
// get past it. Marking it chosen up front is the equivalent of a parent who has
// already answered it.
const LANG_CHOSEN_KEY = 'astroli_parent_language_chosen';
function skipLanguageStep() {
  localStorage.setItem(LANG_CHOSEN_KEY, '1');
}

describe('parent onboarding — email → consent → journey', () => {
  beforeEach(() => {
    hoisted.searchParams = new URLSearchParams('');
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('walks email → consent → sends the invite on the consent click → journey picker', async () => {
    skipLanguageStep();
    const fetchMock = stubFetch({ setupState: { step: 'no_child' } });
    const user = userEvent.setup();
    render(<ParentOnboardingContent />);

    // Step 1 of 3 — name + email, nothing sent yet. The name is required: it is
    // the only source of the child's real name, since magic-link signup never
    // sees a Google profile and would otherwise fall back to the email prefix.
    expect(await screen.findByText("Set up your child's account")).toBeInTheDocument();
    const continueButton = screen.getByRole('button', { name: /Continue to consent/ });
    await user.type(screen.getByLabelText("Child's Gmail"), 'child@gmail.com');
    expect(continueButton).toBeDisabled();
    await user.type(screen.getByLabelText("Child's first name"), 'Amir');
    expect(continueButton).toBeEnabled();
    await user.click(continueButton);

    // Step 2 of 3 — consent shows the email as text, button disabled until ticked.
    expect(await screen.findByText('Almost there')).toBeInTheDocument();
    expect(screen.getByText('child@gmail.com')).toBeInTheDocument();
    const consentButton = screen.getByRole('button', { name: /Send invite/ });
    expect(consentButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(consentButton).toBeEnabled();
    await user.click(consentButton);

    // The consent click records consent AND dispatches the invite, carrying the
    // name the parent typed so the child's account is created with it.
    const inviteCall = fetchMock.mock.calls.find(c => String(c[0]) === '/api/parent/child-invite');
    expect(inviteCall).toBeTruthy();
    expect(JSON.parse((inviteCall![1] as RequestInit).body as string)).toEqual({
      childEmail: 'child@gmail.com',
      childName:  'Amir',
    });

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
    skipLanguageStep();
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

// ── Language step ───────────────────────────────────────────────────────────
//
// The whole point of moving this to the front: an Israeli parent used to read
// the entire signup in English before reaching the language toggle on the LAST
// step. See specs/shared/language/spec.md.

describe('parent onboarding — language comes first', () => {
  beforeEach(() => {
    hoisted.searchParams = new URLSearchParams('');
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows the language step before the tour to a brand-new parent', async () => {
    stubFetch({ setupState: { step: 'no_child' }, consentStatus: { hasCurrentConsent: false } });
    render(<ParentOnboardingContent />);

    expect(await screen.findByText('Choose your language')).toBeInTheDocument();
    expect(screen.queryByText('Multiple planets, one big idea')).not.toBeInTheDocument();
  });

  it('saves the choice, remembers it, and moves on to the tour', async () => {
    const fetchMock = stubFetch({ setupState: { step: 'no_child' }, consentStatus: { hasCurrentConsent: false } });
    const user = userEvent.setup();
    render(<ParentOnboardingContent />);

    await screen.findByText('Choose your language');
    await user.click(screen.getByRole('radio', { name: /עברית/ }));
    await user.click(screen.getByRole('button', { name: 'המשך' }));

    const call = fetchMock.mock.calls.find(c => String(c[0]).startsWith('/api/parent/language'));
    expect(call).toBeTruthy();
    const body = JSON.parse((call![1] as any).body);
    expect(body.language).toBe('he');
    // Timezone rides along — the summary emails need it to know when 07:00
    // falls for this parent.
    expect(typeof body.timezone === 'string' || body.timezone === undefined).toBe(true);

    expect(await screen.findByText('Multiple planets, one big idea')).toBeInTheDocument();
    expect(localStorage.getItem(LANG_CHOSEN_KEY)).toBe('1');
  });

  it('renders its own copy in the selected language before continuing', async () => {
    stubFetch({ setupState: { step: 'no_child' }, consentStatus: { hasCurrentConsent: false } });
    const user = userEvent.setup();
    render(<ParentOnboardingContent />);

    await screen.findByText('Choose your language');
    await user.click(screen.getByRole('radio', { name: /עברית/ }));

    // Picking Hebrew flips the screen immediately — the parent sees the effect
    // of their choice before they commit to it.
    expect(await screen.findByText('בחרי את השפה שלך')).toBeInTheDocument();
  });

  it('skips the language step for a parent who already answered it', async () => {
    skipLanguageStep();
    stubFetch({ setupState: { step: 'no_child' }, consentStatus: { hasCurrentConsent: false } });
    render(<ParentOnboardingContent />);

    expect(await screen.findByText('Multiple planets, one big idea')).toBeInTheDocument();
    expect(screen.queryByText('Choose your language')).not.toBeInTheDocument();
  });

  it('no longer sends a language with the journey selection — the API reads the parent', async () => {
    skipLanguageStep();
    const fetchMock = stubFetch({
      setupState: { step: 'no_journey' },
      consentStatus: { hasCurrentConsent: true },
    });
    const user = userEvent.setup();
    render(<ParentOnboardingContent />);

    await screen.findByText(JOURNEY_TITLE);
    await user.click(screen.getByText(JOURNEY_TITLE));
    await user.click(screen.getByRole('button', { name: /Start this journey/i }));

    const call = fetchMock.mock.calls.find(c => String(c[0]).startsWith('/api/parent/family-class'));
    expect(call).toBeTruthy();
    expect(JSON.parse((call![1] as any).body)).toEqual({ journeyId: 'j1' });
  });

  it('has no language toggle left on the journey step', async () => {
    skipLanguageStep();
    stubFetch({ setupState: { step: 'no_journey' }, consentStatus: { hasCurrentConsent: true } });
    render(<ParentOnboardingContent />);

    await screen.findByText(JOURNEY_TITLE);
    expect(screen.queryByRole('group', { name: 'Journey language' })).not.toBeInTheDocument();
  });
});
