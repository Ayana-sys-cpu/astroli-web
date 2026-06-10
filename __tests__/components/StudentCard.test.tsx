// src/astroli-web/__tests__/components/StudentCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StudentCard from '@/components/teacher/students/StudentCard';
import type { StudentSummary } from '@/app/api/teacher/students/route';

const base: StudentSummary = {
  studentId: 'abc-123',
  name: 'Asaf Levy',
  initials: 'AL',
  lastSeenAt: null,
  isActiveNow: false,
  signalType: null,
  journeyEnrollments: [{ journeyId: 'j1', title: '3A English – Rome Unit' }],
};

describe('StudentCard', () => {
  it('renders the student name', () => {
    render(<StudentCard student={base} onClick={() => {}} />);
    expect(screen.getByText('Asaf Levy')).toBeInTheDocument();
  });

  it('renders initials in the avatar zone', () => {
    render(<StudentCard student={base} onClick={() => {}} />);
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('renders journey pill', () => {
    render(<StudentCard student={base} onClick={() => {}} />);
    expect(screen.getByText('3A English – Rome Unit')).toBeInTheDocument();
  });

  it('shows "Active now" when isActiveNow is true', () => {
    render(<StudentCard student={{ ...base, isActiveNow: true }} onClick={() => {}} />);
    expect(screen.getByText(/active now/i)).toBeInTheDocument();
  });

  it('shows "Not started" when lastSeenAt is null and not active', () => {
    render(<StudentCard student={base} onClick={() => {}} />);
    expect(screen.getByText(/not started/i)).toBeInTheDocument();
  });

  it('shows formatted timestamp when lastSeenAt is set', () => {
    render(<StudentCard student={{ ...base, lastSeenAt: '2026-06-09T14:30:00.000Z' }} onClick={() => {}} />);
    expect(screen.getByText(/last seen/i)).toBeInTheDocument();
  });

  it('calls onClick with studentId when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<StudentCard student={base} onClick={onClick} />);
    container.firstElementChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).toHaveBeenCalledWith('abc-123');
  });
});
