// src/astroli-web/__tests__/components/PlanetSummaryScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlanetSummaryScreen from '@/components/PlanetSummaryScreen';

const baseProps = {
  insights:  [{ goalSlug: 'goal-1', insightText: 'Plants use chlorophyll to capture sunlight.', evidence: '' }],
  onDismiss: () => {},
};

describe('PlanetSummaryScreen — read-only summary (FR-005, FR-006)', () => {
  it('renders captured insights with no editing affordance anywhere', () => {
    render(<PlanetSummaryScreen {...baseProps} />);
    expect(screen.getByText('Plants use chlorophyll to capture sunlight.', { exact: false })).toBeInTheDocument();
    expect(screen.queryByTitle('Edit this insight')).not.toBeInTheDocument();
  });

  it('never renders a "Lock it in" button or an "add something I missed" input', () => {
    render(<PlanetSummaryScreen {...baseProps} />);
    expect(screen.queryByText(/lock it in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/add something i missed/i)).not.toBeInTheDocument();
  });

  it('shows a single dismiss action that calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<PlanetSummaryScreen {...baseProps} onDismiss={onDismiss} />);
    screen.getByText('Close').click();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('renders a term row for each introduced term', () => {
    render(
      <PlanetSummaryScreen
        {...baseProps}
        introducedTerms={[{ label: 'Chlorophyll', definition: 'The green pigment that captures sunlight.' }]}
      />,
    );
    expect(screen.getByText('Chlorophyll')).toBeInTheDocument();
  });

  it('renders nothing broken when there are no introduced terms', () => {
    render(<PlanetSummaryScreen {...baseProps} introducedTerms={[]} />);
    expect(screen.getByText('Plants use chlorophyll to capture sunlight.', { exact: false })).toBeInTheDocument();
  });

  it('prefers a historical studentAddition over the base insightText when present (FR-010)', () => {
    render(
      <PlanetSummaryScreen
        {...baseProps}
        insights={[{ goalSlug: 'goal-1', insightText: 'Base text.', evidence: '', studentAddition: 'My own words on it.' } as never]}
      />,
    );
    expect(screen.getByText('My own words on it.')).toBeInTheDocument();
    expect(screen.queryByText('Base text.')).not.toBeInTheDocument();
  });
});
