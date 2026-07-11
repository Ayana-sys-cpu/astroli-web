/**
 * Signed handoff of the middleware-verified Supabase user to API route handlers.
 *
 * The middleware already pays one Supabase Auth round trip (`getUser()`) per
 * request. This module lets it forward the verified user in a request header
 * so `requireAuth()` can skip a second, identical round trip.
 *
 * Security model:
 * - The value is HMAC-SHA256 signed with the server-only service-role key, so
 *   a client-supplied header can never verify — even on routes the middleware
 *   matcher misses.
 * - The payload carries a short expiry, so a leaked value (e.g. from server
 *   logs) cannot be replayed beyond the lifetime of the request that made it.
 *
 * Edge-safe: uses only Web APIs (WebCrypto, btoa/atob, TextEncoder) so the
 * middleware (Edge runtime) and route handlers (Node) share one implementation.
 */
import type { User } from '@supabase/supabase-js';

export const VERIFIED_USER_HEADER = 'x-verified-user';

// The header only needs to survive the middleware → route-handler hop within
// a single request; 30s absorbs slow cold starts and minor clock skew.
const HEADER_TTL_MS = 30_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToBase64(new Uint8Array(signature));
}

// Comparison time must not depend on where the strings first differ, so a
// forged signature can't be guessed byte-by-byte via response timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

/**
 * Serialises and signs a verified user for the forwarded request header.
 * Output is ASCII-safe (base64 payload + "." + base64 signature).
 */
export async function encodeVerifiedUserHeader(user: User, secret: string): Promise<string> {
  const payload = bytesToBase64(
    new TextEncoder().encode(JSON.stringify({ user, expiresAt: Date.now() + HEADER_TTL_MS })),
  );
  return `${payload}.${await signPayload(payload, secret)}`;
}

/**
 * Verifies a header value produced by {@link encodeVerifiedUserHeader}.
 * Returns the user, or null for any missing, malformed, forged, or expired
 * value — callers fall back to their own Supabase Auth check.
 */
export async function decodeVerifiedUserHeader(
  value: string | null,
  secret: string | undefined,
): Promise<User | null> {
  if (!value || !secret) return null;

  const separator = value.lastIndexOf('.');
  if (separator < 0) return null;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);

  if (!timingSafeEqual(signature, await signPayload(payload, secret))) return null;

  try {
    // The signature proves the payload was produced by encodeVerifiedUserHeader
    // from a genuine User, so the parse target is trustworthy.
    const parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(payload))) as {
      user: User;
      expiresAt: number;
    };
    if (Date.now() > parsed.expiresAt) return null;
    if (typeof parsed.user?.id !== 'string' || parsed.user.id === '') return null;
    return parsed.user;
  } catch {
    return null;
  }
}
