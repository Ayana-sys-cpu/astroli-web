import { describe, it, expect, afterEach, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  VERIFIED_USER_HEADER,
  encodeVerifiedUserHeader,
  decodeVerifiedUserHeader,
} from '@/lib/verified-user-header';

const SECRET = 'test-service-role-secret';

function testUser(overrides: Partial<User> = {}): User {
  return {
    id: 'auth-user-1',
    aud: 'authenticated',
    email: 'student@example.com',
    created_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'email' },
    user_metadata: { role: 'student', student_id: 'student-1' },
    ...overrides,
  } as User;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('verified-user-header codec', () => {
  it('exposes the header name used by middleware and requireAuth', () => {
    expect(VERIFIED_USER_HEADER).toBe('x-verified-user');
  });

  it('round-trips a user: decode(encode(user)) returns the same user', async () => {
    const encoded = await encodeVerifiedUserHeader(testUser(), SECRET);
    const decoded = await decodeVerifiedUserHeader(encoded, SECRET);
    expect(decoded).toEqual(testUser());
  });

  it('produces an ASCII-safe header value for unicode metadata (Hebrew names)', async () => {
    const user = testUser({ user_metadata: { role: 'student', display_name: 'אילנה' } });
    const encoded = await encodeVerifiedUserHeader(user, SECRET);
    // HTTP header values must be ISO-8859-1 safe.
    expect(encoded).toMatch(/^[\x20-\x7e]+$/);
    const decoded = await decodeVerifiedUserHeader(encoded, SECRET);
    expect(decoded?.user_metadata?.display_name).toBe('אילנה');
  });

  it('rejects a tampered payload', async () => {
    const encoded = await encodeVerifiedUserHeader(testUser(), SECRET);
    const [payload, signature] = encoded.split('.');
    const tamperedChar = payload[0] === 'A' ? 'B' : 'A';
    const tampered = `${tamperedChar}${payload.slice(1)}.${signature}`;
    expect(await decodeVerifiedUserHeader(tampered, SECRET)).toBeNull();
  });

  it('rejects a value signed with a different secret (forged header)', async () => {
    const forged = await encodeVerifiedUserHeader(testUser(), 'attacker-known-secret');
    expect(await decodeVerifiedUserHeader(forged, SECRET)).toBeNull();
  });

  it('rejects malformed values and missing input', async () => {
    expect(await decodeVerifiedUserHeader(null, SECRET)).toBeNull();
    expect(await decodeVerifiedUserHeader('', SECRET)).toBeNull();
    expect(await decodeVerifiedUserHeader('no-separator', SECRET)).toBeNull();
    expect(await decodeVerifiedUserHeader('not-base64!!.not-a-sig', SECRET)).toBeNull();
  });

  it('rejects any value when the secret is missing (misconfigured server)', async () => {
    const encoded = await encodeVerifiedUserHeader(testUser(), SECRET);
    expect(await decodeVerifiedUserHeader(encoded, undefined)).toBeNull();
  });

  it('rejects an expired header (replay protection)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-11T10:00:00Z'));
    const encoded = await encodeVerifiedUserHeader(testUser(), SECRET);

    vi.setSystemTime(new Date('2026-07-11T10:00:29Z'));
    expect(await decodeVerifiedUserHeader(encoded, SECRET)).not.toBeNull();

    vi.setSystemTime(new Date('2026-07-11T10:00:31Z'));
    expect(await decodeVerifiedUserHeader(encoded, SECRET)).toBeNull();
  });

  it('rejects a signed payload whose user shape is invalid', async () => {
    // Same signing scheme but the payload is not a user object.
    const bogus = await encodeVerifiedUserHeader({ id: '' } as User, SECRET);
    expect(await decodeVerifiedUserHeader(bogus, SECRET)).toBeNull();
  });
});
