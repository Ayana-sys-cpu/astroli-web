import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeeklySignalCard from '@/app/parent/dashboard/WeeklySignalCard';

describe('WeeklySignalCard', () => {
  it('renders the headline and conversation starter, with no teacher-only actions', () => {
    render(
      <WeeklySignalCard
        signal={{
          signalType: 'breakthrough',
          signalCreatedAt: new Date().toISOString(),
          headline: 'Maya had a breakthrough this week',
          conversationStarter: 'Ask Maya what they discovered about atoms.',
        }}
      />
    );
    expect(screen.getByText('Maya had a breakthrough this week')).toBeInTheDocument();
    expect(screen.getByText(/Ask Maya what they discovered about atoms/)).toBeInTheDocument();
    expect(screen.queryByText(/flag for follow-up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/mark as done/i)).not.toBeInTheDocument();
  });
});
