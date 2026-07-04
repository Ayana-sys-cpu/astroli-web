// src/astroli-web/__tests__/components/PlanetVoicePanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlanetVoicePanel from '@/components/PlanetVoicePanel';

const character = {
  id: 'c1', planet_id: 'planet-1', name: 'Galileo', mode: 'real' as const,
  bio: '', era: '', location: '', voice_profile: '', teaching_goal: '',
  knowledge_cutoff: '', portrait_url: null, listening_video_url: null,
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

// The "Complete Learning" CTA (and its isLocked/completionReady/onCompleteLearning
// props) was removed as part of auto-planet-completion — the summary now appears
// automatically the instant the last goal is reached, there's nothing left to tap.
describe('PlanetVoicePanel — no manual completion gate (FR-001, FR-007)', () => {
  it('never renders a Complete Learning CTA, regardless of props passed', () => {
    render(<PlanetVoicePanel {...baseProps} />);
    expect(screen.queryByText(/complete learning/i)).not.toBeInTheDocument();
  });

  it('still renders the discovery review button and calls onViewDiscovery when tapped', () => {
    const onViewDiscovery = vi.fn();
    render(<PlanetVoicePanel {...baseProps} onViewDiscovery={onViewDiscovery} />);
    fireEvent.click(screen.getByText("What I've discovered here"));
    expect(onViewDiscovery).toHaveBeenCalledTimes(1);
  });
});
