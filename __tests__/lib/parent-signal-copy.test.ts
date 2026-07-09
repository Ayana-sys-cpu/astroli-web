import { describe, it, expect } from 'vitest';
import { getSignalCopy } from '@/lib/parent-signal-copy';

describe('getSignalCopy', () => {
  it('breakthrough mentions the mission topic when provided', () => {
    const copy = getSignalCopy('breakthrough');
    expect(copy.headline('Maya')).toBe('Maya had a breakthrough this week');
    expect(copy.conversationStarter('Maya', 'atoms')).toBe('Ask Maya what they discovered about atoms.');
    expect(copy.conversationStarter('Maya', null)).not.toContain('null');
  });

  it('grace_completion never mentions teacher-facing thresholds', () => {
    const copy = getSignalCopy('grace_completion');
    expect(copy.headline('Maya').toLowerCase()).not.toContain('grace threshold');
    expect(copy.conversationStarter('Maya')).toContain('Maya');
  });

  it('stuck uses encouraging wording, not clinical teacher language', () => {
    const copy = getSignalCopy('stuck');
    const headline = copy.headline('Maya').toLowerCase();
    expect(headline).not.toContain('not connecting to the teaching goal');
    expect(headline).toContain('encouragement');
  });

  it('non_engagement reads as a gentle nudge', () => {
    const copy = getSignalCopy('non_engagement');
    expect(copy.headline('Maya')).toBe("Maya hasn't visited Astroli this week");
    expect(copy.conversationStarter('Maya')).toContain('Maya');
  });

  it('every signal type produces non-empty, name-including copy', () => {
    const types = ['breakthrough', 'grace_completion', 'stuck', 'non_engagement'] as const;
    for (const type of types) {
      const copy = getSignalCopy(type);
      expect(copy.headline('Sam')).toContain('Sam');
      expect(copy.conversationStarter('Sam')).toContain('Sam');
    }
  });
});
