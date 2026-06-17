import { describe, it, expect } from 'vitest';
import { normaliseCourseId } from '@/lib/normalise-course-id';

describe('normaliseCourseId', () => {
  it('passes through a plain numeric string unchanged', () => {
    expect(normaliseCourseId('123456')).toBe('123456');
  });

  it('decodes a base64-encoded numeric course ID', () => {
    // Buffer.from('789012').toString('base64') === 'Nzg5MDEy'
    const base64Id = Buffer.from('789012').toString('base64');
    expect(normaliseCourseId(base64Id)).toBe('789012');
  });

  it('returns non-numeric non-base64 strings unchanged', () => {
    expect(normaliseCourseId('not-a-course-id')).toBe('not-a-course-id');
  });

  it('returns base64 strings that decode to non-numeric values unchanged', () => {
    // 'hello' in base64 is 'aGVsbG8=' — decodes to 'hello', which is not numeric
    expect(normaliseCourseId('aGVsbG8=')).toBe('aGVsbG8=');
  });

  it('handles empty string without throwing', () => {
    expect(normaliseCourseId('')).toBe('');
  });
});
