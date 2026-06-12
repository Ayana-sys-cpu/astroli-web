import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MissionStatusBar from '@/components/teacher/journey/MissionStatusBar';

describe('MissionStatusBar', () => {
  const baseMission = { id: 'm1', order: 2, title: 'Should AI decide school rules?' };

  it('renders compact active bar when isActive is true', () => {
    render(
      <MissionStatusBar
        mission={baseMission}
        isActive={true}
        onActivate={vi.fn()}
        activating={false}
      />
    );
    expect(screen.getByText(/mission 2/i)).toBeTruthy();
    expect(screen.getByText(/active/i)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders activation card with button when not active', () => {
    render(
      <MissionStatusBar
        mission={baseMission}
        isActive={false}
        onActivate={vi.fn()}
        activating={false}
      />
    );
    expect(screen.getByRole('button', { name: /activate mission/i })).toBeTruthy();
  });

  it('calls onActivate when Activate button is clicked', () => {
    const onActivate = vi.fn();
    render(
      <MissionStatusBar
        mission={baseMission}
        isActive={false}
        onActivate={onActivate}
        activating={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /activate mission/i }));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('disables button when activating is true', () => {
    render(
      <MissionStatusBar
        mission={baseMission}
        isActive={false}
        onActivate={vi.fn()}
        activating={true}
      />
    );
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });
});
