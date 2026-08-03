import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Minimal supabase fake: only the users-by-id lookup resolveUserLanguage does ─

let userRows: Array<{ id: string; language?: unknown }> = [];
let lookupError: { message: string } | null = null;

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const filters: Array<[string, any]> = [];
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => { filters.push([col, val]); return builder; },
        maybeSingle: async () => {
          if (lookupError) return { data: null, error: lookupError };
          if (table !== 'users') return { data: null, error: null };
          const row = userRows.find(r => filters.every(([c, v]) => (r as any)[c] === v));
          return { data: row ?? null, error: null };
        },
      };
      return builder;
    },
  },
}));

const { resolveUserLanguage, asLanguage } = await import('@/lib/student-language');

beforeEach(() => {
  userRows = [];
  lookupError = null;
  vi.restoreAllMocks();
});

describe('resolveUserLanguage', () => {
  it('returns the stored language for a known user', async () => {
    userRows = [{ id: 'amir', language: 'he' }];
    expect(await resolveUserLanguage('amir')).toBe('he');
  });

  it('returns English for a known English user', async () => {
    userRows = [{ id: 'eran', language: 'en' }];
    expect(await resolveUserLanguage('eran')).toBe('en');
  });

  it('falls back to English for an unknown user', async () => {
    userRows = [{ id: 'eran', language: 'en' }];
    expect(await resolveUserLanguage('nobody')).toBe('en');
  });

  it('falls back to English for a null or undefined id without querying', async () => {
    expect(await resolveUserLanguage(null)).toBe('en');
    expect(await resolveUserLanguage(undefined)).toBe('en');
    expect(await resolveUserLanguage('')).toBe('en');
  });

  // A value outside he/en can only arrive if the CHECK constraint is dropped or
  // bypassed. Narrowing rather than passing it through keeps a bad row from
  // reaching a prompt-file path like prompts/<lang>/ downstream.
  it('narrows an invalid stored value to English rather than passing it through', async () => {
    userRows = [{ id: 'weird', language: 'fr' }];
    expect(await resolveUserLanguage('weird')).toBe('en');
  });

  it('falls back to English when the row exists but language is null', async () => {
    userRows = [{ id: 'blank', language: null }];
    expect(await resolveUserLanguage('blank')).toBe('en');
  });

  it('logs and falls back to English on a lookup error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    lookupError = { message: 'connection reset' };
    expect(await resolveUserLanguage('amir')).toBe('en');
    expect(spy).toHaveBeenCalled();
  });
});

describe('asLanguage', () => {
  it('accepts only he, treating everything else as en', () => {
    expect(asLanguage('he')).toBe('he');
    expect(asLanguage('en')).toBe('en');
    expect(asLanguage('HE')).toBe('en');
    expect(asLanguage(null)).toBe('en');
    expect(asLanguage(undefined)).toBe('en');
    expect(asLanguage(42)).toBe('en');
  });
});
