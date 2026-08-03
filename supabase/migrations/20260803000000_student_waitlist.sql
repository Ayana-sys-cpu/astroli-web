-- Student waitlist for the invite-gated mobile app.
--
-- The student app is invite-only: a child reaches Astroli because a parent
-- invited them (child_invites) or because App Review used the reviewer code.
-- Anyone else who signs in is recorded here instead of getting an account,
-- so no child account is ever created without a consenting adult behind it.
--
-- Parents have their own list (parent_waitlist) — this is the child-side
-- equivalent and is kept separate so the founder can tell the two apart.

CREATE TABLE IF NOT EXISTS student_waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  first_name  TEXT,
  -- Which sign-in button they came from: 'apple' | 'google'.
  provider    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service-role only, same posture as the family-track tables. No anon grant:
-- nothing client-side ever reads or writes this list.
ALTER TABLE student_waitlist ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON student_waitlist TO service_role;
