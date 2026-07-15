import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JourneyCard from '@/components/student/JourneyCard';
import type { HomeJourney } from '@/lib/student-home';

const live: HomeJourney = {
  classId: 'class-1', className: 'World History', teacherName: 'Mr. Lee',
  status: 'live', activeMissionId: 'mission-1', missionTitle: 'The Schism Mission',
  planetsExplored: 3, planetsTotal: 6,
};

const idle: HomeJourney = {
  classId: 'class-2', className: 'Algebra I', teacherName: 'Mr. Osei', status: 'idle',
};

const idleFamily: HomeJourney = {
  classId: 'class-3', className: 'Science 7th Grade', teacherName: null, status: 'idle', isFamilyClass: true,
};

/**
 * CTA labels live sentence-case in i18n and are uppercased by CSS
 * (`text-transform: uppercase`), which jsdom does not fold into textContent.
 * The spec calls for an uppercase CTA, so assert both halves of that contract:
 * the label itself, and the class that renders it uppercase to the student.
 */
function expectCta(label: string) {
  const cta = screen.getByText(label);
  expect(cta).toBeInTheDocument();
  expect(cta).toHaveClass('uppercase');
}

describe('JourneyCard', () => {
  it('renders the class name, teacher, and CTA for a live journey', () => {
    render(<JourneyCard journey={live} onClick={() => {}} />);
    expect(screen.getByText(/World History/)).toBeInTheDocument();
    expect(screen.getByText(/MR. LEE/)).toBeInTheDocument();
    expectCta('Continue mission →');
    expect(screen.getByText('3 / 6')).toBeInTheDocument();
  });

  it('calls onClick when a live card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<JourneyCard journey={live} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders an idle journey as disabled with no CTA', () => {
    render(<JourneyCard journey={idle} onClick={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.queryByText('Continue mission →')).not.toBeInTheDocument();
  });

  it('does not call onClick when an idle card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<JourneyCard journey={idle} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders an idle family journey as clickable with a pick-a-mission CTA', () => {
    render(<JourneyCard journey={idleFamily} onClick={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    expect(screen.getByText('PICK A MISSION')).toBeInTheDocument();
    expectCta('Choose mission →');
  });

  it('calls onClick when an idle family journey card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<JourneyCard journey={idleFamily} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
