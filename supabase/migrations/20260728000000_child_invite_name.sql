-- Store the child's real first name on the invite.
--
-- The family-track invite was email-only, and the child authenticates by magic
-- link rather than Google OAuth — so no profile name ever reaches us. Signup
-- fell back to the email local part, which greeted a child as "Amirmakmal" and
-- showed the same string to their parent on the dashboard.
--
-- The parent now types the name when inviting; it is carried on the invite row
-- so /api/auth/accept-invite can use it when the child's account is created.
--
-- Mirrored at prisma/migrations/20260728000000_child_invite_name/ so that
-- `prisma migrate deploy` applies it during the Vercel build — the API reads
-- this column, so it must exist before the new code serves traffic. Both are
-- IF NOT EXISTS: whichever runs first wins and the other is a no-op.

ALTER TABLE public.child_invites
  ADD COLUMN IF NOT EXISTS child_name text;

COMMENT ON COLUMN public.child_invites.child_name IS
  'Child''s first name as entered by the parent at invite time. Used for the invite email greeting and to seed users.first_name on acceptance. Null for invites created before this column existed.';
