import { describe, it, expect } from 'vitest';
import { toDisplayFirstName } from '@/lib/display-name';

describe('toDisplayFirstName', () => {
  it('passes a genuine first name through unchanged', () => {
    expect(toDisplayFirstName('Noa')).toBe('Noa');
  });

  it('keeps hyphenated names intact', () => {
    expect(toDisplayFirstName('Jean-Pierre')).toBe('Jean-Pierre');
  });

  it('extracts and capitalizes the first segment of a dotted email prefix', () => {
    expect(toDisplayFirstName('ayana.student.test')).toBe('Ayana');
  });

  it('strips the domain from a full email address', () => {
    expect(toDisplayFirstName('noa@example.com')).toBe('Noa');
  });

  it('drops digits from an email-derived name', () => {
    expect(toDisplayFirstName('noa123@example.com')).toBe('Noa');
  });

  it('handles underscore-separated prefixes', () => {
    expect(toDisplayFirstName('dana_levi')).toBe('Dana');
  });

  it('keeps Hebrew names intact', () => {
    expect(toDisplayFirstName('נועה')).toBe('נועה');
  });

  it('returns the trimmed input when nothing presentable can be extracted', () => {
    expect(toDisplayFirstName('12345')).toBe('12345');
  });
});
