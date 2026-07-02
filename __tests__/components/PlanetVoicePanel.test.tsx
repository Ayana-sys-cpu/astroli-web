// src/astroli-web/__tests__/components/PlanetVoicePanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlanetVoicePanel from '@/components/PlanetVoicePanel';

const character = {
  id: 'c1', planet_id: 'planet-1', name: 'Galileo', mode: 'real' as const,
  bio: '', era: '', location: '', voice_profile: '', teaching_goal: '',
  knowledge_cutoff: '', portrait_url: null, listening_video_url: null, thinking_video_url: null,
};

const baseProps = {
  character,
  messages: [{ id: 'm1', speaker: 'student' as const, content: 'hi' }],
  input: '',
  setInput: () => {},
  send: () => {},
  sendText: () => {},
  loading: false,
  thinking: false,
};

describe('PlanetVoicePanel — persistent Complete Learning CTA', () => {
  it('does not render the CTA when completionReady is false', () => {
    render(<PlanetVoicePanel {...baseProps} completionReady={false} onCompleteLearning={() => {}} />);
    expect(screen.queryByText('Complete Learning →')).not.toBeInTheDocument();
  });

  it('does not render the CTA when onCompleteLearning is not provided, even if completionReady is true', () => {
    render(<PlanetVoicePanel {...baseProps} completionReady={true} />);
    expect(screen.queryByText('Complete Learning →')).not.toBeInTheDocument();
  });

  it('renders the CTA and calls onCompleteLearning when tapped, once completionReady is true', () => {
    const onCompleteLearning = vi.fn();
    render(<PlanetVoicePanel {...baseProps} completionReady={true} onCompleteLearning={onCompleteLearning} />);
    const cta = screen.getByText('Complete Learning →');
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    expect(onCompleteLearning).toHaveBeenCalledTimes(1);
  });

  it('hides the CTA once the planet is already locked, even if completionReady is still true in memory', () => {
    render(<PlanetVoicePanel {...baseProps} completionReady={true} onCompleteLearning={() => {}} isLocked={true} />);
    expect(screen.queryByText('Complete Learning →')).not.toBeInTheDocument();
  });
});
