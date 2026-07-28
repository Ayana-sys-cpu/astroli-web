import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchBar from '@/app/master/SearchBar';

const LABEL = 'Ask anything you are curious about';

describe('Master SearchBar', () => {
  it('takes the cursor when the student arrived to type', () => {
    render(<SearchBar onSubmit={vi.fn()} autoFocus />);
    expect(screen.getByLabelText(LABEL)).toHaveFocus();
  });

  it('leaves the cursor alone on a plain visit', () => {
    render(<SearchBar onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(LABEL)).not.toHaveFocus();
  });
});
