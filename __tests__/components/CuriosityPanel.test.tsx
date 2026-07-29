import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CuriosityPanel from '@/app/home/CuriosityPanel';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const EDIT = {
  id: 'edit-1',
  edit_type: 'did_you_know',
  hook: 'Octopuses have three hearts.',
  media_url: 'https://img/octopus.jpg',
  media_type: 'image',
  media_credit: 'Someone / Unsplash',
};

/** Routes each fetch by URL so a test only states the responses it cares about. */
function mockFetch(handlers: { spotlight?: unknown; dive?: { status: number; body: unknown } }) {
  const fetchMock = vi.fn(async (url: string) => {
    if (String(url).includes('/api/master/spotlight')) {
      if (handlers.spotlight === 'reject') throw new Error('offline');
      return { ok: true, json: async () => handlers.spotlight ?? { enabled: true, edit: null } } as Response;
    }
    const dive = handlers.dive ?? { status: 201, body: { session: { id: 'session-9' } } };
    return {
      ok: dive.status < 400,
      status: dive.status,
      json: async () => dive.body,
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => { push.mockClear(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('CuriosityPanel — behind the flag', () => {
  it('renders nothing at all for a student it is not enabled for', async () => {
    mockFetch({ spotlight: { enabled: false, edit: null } });
    const { container } = render(<CuriosityPanel lang="en" />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('renders nothing when the request fails — it fails closed', async () => {
    mockFetch({ spotlight: 'reject' });
    const { container } = render(<CuriosityPanel lang="en" />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('appears once a retry succeeds — a first unauthorized answer is not final', async () => {
    // Straight after sign-in the session cookie can lag the first request.
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1;
      return call === 1
        ? ({ ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) } as Response)
        : ({ ok: true, json: async () => ({ enabled: true, edit: EDIT }) } as Response);
    }));

    render(<CuriosityPanel lang="en" />);

    expect(await screen.findByText('Octopuses have three hearts.', {}, { timeout: 4000 })).toBeInTheDocument();
  });
});

describe('CuriosityPanel — nothing to show', () => {
  it('renders the label and the invitation, with no card and no skeleton', async () => {
    mockFetch({ spotlight: { enabled: true, edit: null } });
    render(<CuriosityPanel lang="en" />);

    expect(await screen.findByText("WHILE YOU'RE HERE")).toBeInTheDocument();
    expect(screen.getByText('or explore anything →')).toHaveAttribute('href', '/master?focus=search');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('CuriosityPanel — an edit to explore', () => {
  it('renders the edit with its type pill and hook', async () => {
    mockFetch({ spotlight: { enabled: true, edit: EDIT } });
    render(<CuriosityPanel lang="en" />);

    expect(await screen.findByText('Octopuses have three hearts.')).toBeInTheDocument();
    expect(screen.getByText('DID YOU KNOW')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', EDIT.media_url);
    expect(screen.getByText('or explore anything →')).toBeInTheDocument();
  });

  it('starts a dive on that edit and opens it, skipping the hub', async () => {
    const fetchMock = mockFetch({ spotlight: { enabled: true, edit: EDIT } });
    render(<CuriosityPanel lang="en" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Explore this →' }));

    const [url, init] = fetchMock.mock.calls.find(([u]) => String(u).includes('/api/master/dive'))!;
    expect(url).toBe('/api/master/dive');
    // defer: the dive screen opens straight away and asks Orin for the opening there.
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ origin: 'edit', edit_id: 'edit-1', defer: true });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/master/dive/session-9'));
  });

  it('starts only one dive when the button is pressed twice', async () => {
    const fetchMock = mockFetch({ spotlight: { enabled: true, edit: EDIT } });
    render(<CuriosityPanel lang="en" />);

    const cta = await screen.findByRole('button', { name: 'Explore this →' });
    await userEvent.click(cta);
    await userEvent.click(cta);

    const diveCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/api/master/dive'));
    expect(diveCalls).toHaveLength(1);
  });

  it('says Orin is recharging instead of navigating when he is unavailable', async () => {
    mockFetch({ spotlight: { enabled: true, edit: EDIT }, dive: { status: 503, body: { error: 'orin_recharging' } } });
    render(<CuriosityPanel lang="en" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Explore this →' }));

    expect(await screen.findByText('Orin is recharging. Try again in a moment.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText('Octopuses have three hearts.')).toBeInTheDocument();
  });

  it('offers a retry when the dive fails for any other reason', async () => {
    mockFetch({ spotlight: { enabled: true, edit: EDIT }, dive: { status: 500, body: { error: 'nope' } } });
    render(<CuriosityPanel lang="en" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Explore this →' }));

    expect(await screen.findByText("That didn't start. Try again.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('never refetches while the student stays on the page', async () => {
    const fetchMock = mockFetch({ spotlight: { enabled: true, edit: EDIT } });
    render(<CuriosityPanel lang="en" />);

    await screen.findByText('Octopuses have three hearts.');
    window.dispatchEvent(new Event('focus'));
    await new Promise((r) => setTimeout(r, 50));

    const spotlightCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/api/master/spotlight'));
    expect(spotlightCalls).toHaveLength(1);
  });
});
