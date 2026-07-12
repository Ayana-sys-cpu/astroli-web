// src/astroli-web/__tests__/components/OrinGuidePanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllDiscoveriesView, scriptedQaReply, type LockedPlanetSummary } from '@/components/OrinGuidePanel';

const mockPush = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const summaries: LockedPlanetSummary[] = [
  {
    planetId: 'planet-photosynthesis',
    planetTitle: 'Photosynthesis',
    completedAt: '2026-06-01T00:00:00.000Z',
    insights: [{ insightText: 'Plants use chlorophyll to capture sunlight.', studentAddition: null }],
    termDefinitions: [{ label: 'Chlorophyll', definition: 'The green pigment that captures sunlight.' }],
  },
  {
    planetId: 'planet-volcanoes',
    planetTitle: 'Volcanoes',
    completedAt: '2026-06-02T00:00:00.000Z',
    insights: [{ insightText: 'Magma becomes lava once it erupts.', studentAddition: null }],
    termDefinitions: [],
  },
];

describe('AllDiscoveriesView', () => {
  it('renders a planet label on every discovery card', () => {
    render(<AllDiscoveriesView summaries={summaries} onClose={() => {}} lang="en" />);
    expect(screen.getAllByText('Photosynthesis')).not.toHaveLength(0);
    expect(screen.getAllByText('Volcanoes')).not.toHaveLength(0);
  });

  it('renders each planet as its own section heading as well', () => {
    render(<AllDiscoveriesView summaries={summaries} onClose={() => {}} lang="en" />);
    expect(screen.getByText('Plants use chlorophyll to capture sunlight.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Magma becomes lava once it erupts.', { exact: false })).toBeInTheDocument();
  });

  it('never renders term definitions, even when a planet has them (FR: terms replaced by drill-down CTA)', () => {
    render(<AllDiscoveriesView summaries={summaries} onClose={() => {}} lang="en" />);
    expect(screen.queryByText('Chlorophyll')).not.toBeInTheDocument();
  });

  it('renders a drill-down CTA for every planet, in the current language', () => {
    render(<AllDiscoveriesView summaries={summaries} onClose={() => {}} lang="en" />);
    expect(screen.getAllByText('Drill down to review →')).toHaveLength(2);
  });

  it('navigates to the planet page when a drill-down CTA is clicked', () => {
    render(<AllDiscoveriesView summaries={summaries} onClose={() => {}} lang="en" />);
    screen.getAllByText('Drill down to review →')[0].click();
    expect(mockPush).toHaveBeenCalledWith('/landscape/planet-photosynthesis?lang=en');
  });

  it('shows the empty state when there are no summaries', () => {
    render(<AllDiscoveriesView summaries={[]} onClose={() => {}} lang="en" />);
    expect(screen.getByText(/haven.t discovered anything yet/i)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<AllDiscoveriesView summaries={summaries} onClose={onClose} lang="en" />);
    screen.getByText('Close').click();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('scriptedQaReply', () => {
  it('cycles through the mission answers by index', () => {
    expect(scriptedQaReply(['a', 'b'], 0, 'en')).toBe('a');
    expect(scriptedQaReply(['a', 'b'], 1, 'en')).toBe('b');
    expect(scriptedQaReply(['a', 'b'], 2, 'en')).toBe('a');
  });

  it('returns a default reply instead of undefined when the mission has no answers (prod bug: literal "undefined" bubble)', () => {
    const reply = scriptedQaReply([], 3, 'en');
    expect(typeof reply).toBe('string');
    expect(reply.length).toBeGreaterThan(0);
    expect(reply).not.toContain('undefined');
  });

  it('localizes the default reply', () => {
    expect(scriptedQaReply([], 0, 'he')).not.toBe(scriptedQaReply([], 0, 'en'));
  });
});
