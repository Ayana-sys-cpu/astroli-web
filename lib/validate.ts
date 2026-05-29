/**
 * Shared Zod validation helpers for API routes.
 *
 * Usage:
 *   import { z, parseBody } from '@/lib/validate';
 *
 *   const Schema = z.object({ name: z.string().min(1) });
 *
 *   const parsed = await parseBody(req, Schema);
 *   if (!parsed.ok) return parsed.response;
 *   const { name } = parsed.data; // fully typed
 */

import { z, ZodSchema } from 'zod';
import { NextResponse } from 'next/server';

export { z };

type ParseOk<T>  = { ok: true;  data: T };
type ParseFail   = { ok: false; response: NextResponse };
type ParseResult<T> = ParseOk<T> | ParseFail;

/**
 * Parse and validate a request body against a Zod schema.
 * Returns { ok: true, data } or { ok: false, response } (400) on failure.
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:   'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: result.data };
}

// ── Common re-usable schemas ───────────────────────────────────────────────────

/** A non-empty string — trims whitespace before validating. */
export const NonEmptyString = z.string().trim().min(1);

/** A Google access token or authorization code — non-empty string. */
export const AccessTokenSchema = z.object({
  accessToken: NonEmptyString,
});

/** An authorization code from the OAuth code flow. */
export const AuthCodeSchema = z.object({
  code: NonEmptyString,
});
