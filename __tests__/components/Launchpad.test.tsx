import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Launchpad from '@/app/master/Launchpad';

const CARDS = [
  { id: 'edit-active', hook: 'She mapped life itself.', tier: 'active' },
  { id: 'edit-upcoming', hook: 'Newton hid calculus for decades.', tier: 'upcoming' },
  { id: 'edit-completed', hook: 'He proved doctors wrong for 1,400 years.', tier: 'completed' },
  { id: 'edit-detour', hook: 'She planted 51 million trees.', tier: 'detour' },
];

function mockFetch(result: 'ok' | 'empty' | 'error' | 'reject') {
  vi.stubGlobal('fetch', vi.fn(async () => {
    if (result === 'reject') throw new Error('offline');
    if (result === 'error') return { ok: false, status: 500, json: async () => ({}) } as Response;
    return { ok: true, json: async () => ({ cards: result === 'ok' ? CARDS : [] }) } as Response;
  }));
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('Launchpad', () => {
  it('shows a card per tier with its label', async () => {
    mockFetch('ok');
    render(<Launchpad onOpen={vi.fn()} />);

    expect(await screen.findByText('She mapped life itself.')).toBeInTheDocument();
    expect(screen.getByText('WHERE YOU ARE')).toBeInTheDocument();
    expect(screen.getByText('COMING UP')).toBeInTheDocument();
    expect(screen.getByText('YOU FINISHED THIS')).toBeInTheDocument();
    expect(screen.getByText('WORTH A DETOUR')).toBeInTheDocument();
  });

  it('starts a dive from the tapped card', async () => {
    mockFetch('ok');
    const onOpen = vi.fn();
    render(<Launchpad onOpen={onOpen} />);

    await userEvent.click(await screen.findByText('Newton hid calculus for decades.'));
    expect(onOpen).toHaveBeenCalledWith('edit-upcoming');
  });

  it('invites the student to search even when no cards come back', async () => {
    mockFetch('empty');
    render(<Launchpad onOpen={vi.fn()} />);

    expect(await screen.findByText('Ask anything. Or start with one of these.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  });

  it('renders as absence rather than an error when the request fails', async () => {
    mockFetch('reject');
    render(<Launchpad onOpen={vi.fn()} />);

    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
    expect(screen.getByText('Ask anything. Or start with one of these.')).toBeInTheDocument();
  });

  it('renders as absence when the endpoint errors', async () => {
    mockFetch('error');
    render(<Launchpad onOpen={vi.fn()} />);

    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  });

  it('does not fire a second dive while one is starting', async () => {
    mockFetch('ok');
    const onOpen = vi.fn();
    render(<Launchpad onOpen={onOpen} busy />);

    const card = await screen.findByText('She planted 51 million trees.');
    await userEvent.click(card);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
