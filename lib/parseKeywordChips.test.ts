import { describe, it, expect } from 'vitest';
import { parseKeywordChips } from './parseKeywordChips';

describe('parseKeywordChips', () => {
  it('single [[term]] produces one keyword segment', () => {
    const result = parseKeywordChips('hello [[פלוגיסטון]] world');
    expect(result).toEqual([
      { type: 'text', value: 'hello ' },
      { type: 'keyword', value: 'פלוגיסטון' },
      { type: 'text', value: ' world' },
    ]);
  });

  it('two [[term]] markers produce two keyword segments', () => {
    const result = parseKeywordChips('[[A]] and [[B]]');
    expect(result).toEqual([
      { type: 'text', value: '' },
      { type: 'keyword', value: 'A' },
      { type: 'text', value: ' and ' },
      { type: 'keyword', value: 'B' },
      { type: 'text', value: '' },
    ]);
  });

  it('no markers returns a single text segment', () => {
    const result = parseKeywordChips('just plain text');
    expect(result).toEqual([{ type: 'text', value: 'just plain text' }]);
  });

  it('malformed [[term] with one closing bracket is plain text, no crash', () => {
    const result = parseKeywordChips('hello [[term] world');
    expect(result).toEqual([{ type: 'text', value: 'hello [[term] world' }]);
  });

  it('empty string returns a single empty text segment', () => {
    const result = parseKeywordChips('');
    expect(result).toEqual([{ type: 'text', value: '' }]);
  });

  it('same term appearing twice both render as keyword segments', () => {
    const result = parseKeywordChips('[[A]] and [[A]] again');
    expect(result).toEqual([
      { type: 'text', value: '' },
      { type: 'keyword', value: 'A' },
      { type: 'text', value: ' and ' },
      { type: 'keyword', value: 'A' },
      { type: 'text', value: ' again' },
    ]);
  });
});
