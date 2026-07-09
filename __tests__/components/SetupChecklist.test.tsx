import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import SetupChecklist from '@/app/parent/dashboard/SetupChecklist';

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));

describe('SetupChecklist', () => {
  it('shows the account step as current and links to onboarding when no child is linked', () => {
    render(
      <SetupChecklist
        step="no_child"
        nextActionLabel="Set up your child's account"
        nextActionHref="/parent/onboarding"
        childName={null}
      />
    );
    expect(screen.getByText("Set up your child's account →")).toBeInTheDocument();
  });

  it('shows guidance text (no dead-end link) when the child has no activity yet', () => {
    render(
      <SetupChecklist step="no_activity" nextActionLabel={null} nextActionHref={null} childName="Maya" />
    );
    expect(screen.getByText(/Maya hasn't started their first mission yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('navigates to the next action href when clicked', async () => {
    const push = vi.fn();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ push });
    const user = userEvent.setup();
    render(
      <SetupChecklist
        step="no_journey"
        nextActionLabel="Choose a journey"
        nextActionHref="/parent/onboarding?step=journey"
        childName="Maya"
      />
    );
    await user.click(screen.getByText('Choose a journey →'));
    expect(push).toHaveBeenCalledWith('/parent/onboarding?step=journey');
  });
});
