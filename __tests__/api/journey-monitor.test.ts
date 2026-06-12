import { describe, it, expect } from 'vitest';
import {
  buildContextLine,
  orderAttentionStudents,
  buildStatusLine,
} from '@/lib/journey-monitor-helpers';

describe('buildContextLine', () => {
  it('returns time-on-planet line for stuck signal', () => {
    const result = buildContextLine('stuck', 'Planet 2', 18);
    expect(result).toBe('On Planet 2 for 18 min, no breakthrough yet');
  });

  it('returns grace completion line', () => {
    const result = buildContextLine('grace_completion', 'Planet 1', null);
    expect(result).toBe('Completed Planet 1 without demonstrating understanding');
  });

  it('returns non-engagement line', () => {
    const result = buildContextLine('non_engagement', null, null);
    expect(result).toBe('No activity since class started');
  });

  it('uses generic planet reference when planet name is null for stuck', () => {
    const result = buildContextLine('stuck', null, 10);
    expect(result).toBe('Has been working for 10 min without a breakthrough');
  });
});

describe('orderAttentionStudents', () => {
  it('sorts grace_completion before stuck before non_engagement', () => {
    const students = [
      { signalType: 'non_engagement' as const, signalCreatedAt: '2026-06-12T10:00:00Z' },
      { signalType: 'grace_completion' as const, signalCreatedAt: '2026-06-12T10:00:00Z' },
      { signalType: 'stuck' as const, signalCreatedAt: '2026-06-12T10:00:00Z' },
    ];
    const ordered = orderAttentionStudents(students as any);
    expect(ordered.map(s => s.signalType)).toEqual([
      'grace_completion', 'stuck', 'non_engagement',
    ]);
  });

  it('within same signal type, sorts most recent first', () => {
    const students = [
      { signalType: 'stuck' as const, signalCreatedAt: '2026-06-12T09:00:00Z' },
      { signalType: 'stuck' as const, signalCreatedAt: '2026-06-12T11:00:00Z' },
    ];
    const ordered = orderAttentionStudents(students as any);
    expect(ordered[0].signalCreatedAt).toBe('2026-06-12T11:00:00Z');
  });
});

describe('buildStatusLine', () => {
  it('returns active planet line when student has active session', () => {
    expect(buildStatusLine(true, 'Planet 2', false)).toBe('Actively on Planet 2');
  });

  it('returns not started when no planet and not active', () => {
    expect(buildStatusLine(false, null, false)).toBe('Not yet started');
  });

  it('returns offline when not seen recently', () => {
    expect(buildStatusLine(false, 'Planet 1', true)).toBe('Offline');
  });
});
