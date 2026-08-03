// Signed unsubscribe tokens.
//
// The link lands in an inbox, so it must work without a session — a parent
// should not have to log in to stop emails. That means the token itself is the
// only thing standing between a stranger and unsubscribing someone: it is an
// HMAC over the parent id, not the id in plain text.
//
// Deliberately does not expire. An unsubscribe link in a year-old email should
// still work; the worst it can do is stop emails the recipient did not want.

import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('UNSUBSCRIBE_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is not set');
  return s;
}

function sign(parentId: string): string {
  return createHmac('sha256', secret()).update(parentId).digest('base64url');
}

export function createUnsubscribeToken(parentId: string): string {
  return `${Buffer.from(parentId).toString('base64url')}.${sign(parentId)}`;
}

/** The parent id, or null if the token is missing, malformed, or not ours. */
export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;

  const [encodedId, signature] = token.split('.');
  if (!encodedId || !signature) return null;

  let parentId: string;
  try {
    parentId = Buffer.from(encodedId, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!parentId) return null;

  const expected = Buffer.from(sign(parentId));
  const actual = Buffer.from(signature);

  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false.
  if (expected.length !== actual.length) return null;
  return timingSafeEqual(expected, actual) ? parentId : null;
}
