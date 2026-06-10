// src/astroli-web/__tests__/components/SignalBadge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignalBadge from '@/components/teacher/students/SignalBadge';

describe('SignalBadge', () => {
  it('renders nothing when signalType is null', () => {
    const { container } = render(<SignalBadge signalType={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a badge for each signal type', () => {
    const types = ['breakthrough', 'grace_completion', 'stuck', 'non_engagement'] as const;
    for (const type of types) {
      const { container } = render(<SignalBadge signalType={type} />);
      expect(container.firstChild).not.toBeNull();
    }
  });

  it('shows tooltip text on hover for breakthrough', async () => {
    const user = userEvent.setup();
    render(<SignalBadge signalType="breakthrough" />);
    const badge = screen.getByRole('img', { name: /breakthrough/i });
    await user.hover(badge);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Breakthrough');
  });

  it('shows tooltip text on hover for non_engagement', async () => {
    const user = userEvent.setup();
    render(<SignalBadge signalType="non_engagement" />);
    const badge = screen.getByRole('img', { name: /non-engagement/i });
    await user.hover(badge);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Non-engagement');
  });
});
