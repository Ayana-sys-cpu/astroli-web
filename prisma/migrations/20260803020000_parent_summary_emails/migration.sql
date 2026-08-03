-- Automated parent summary emails: timezone, opt-out, and the send log.
--
-- The dashboard only helps a parent who visits it. These emails carry one thing
-- their child learned to the inbox, at 07:00 in the parent's OWN local time —
-- the pilot spans Israel and the US, so "7am" is two different moments.
--
-- The send log's unique constraint IS the one-per-day guarantee. Application
-- logic would let a retried cron run, or two overlapping invocations, send a
-- second email; a constraint cannot. A child on a roll can finish three topics
-- in one sitting, and their parent must still get exactly one email.
--
-- Mirrored at prisma/migrations/20260803020000_parent_summary_emails/ so that
-- `prisma migrate deploy` applies it during the Vercel build. All statements are
-- idempotent: whichever runs first wins and the other is a no-op.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Jerusalem';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS summary_emails_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.timezone IS
  'IANA timezone, captured from the browser at signup. Decides when 07:00 falls for this person. Defaults to Asia/Jerusalem — the entire pilot cohort is Israeli.';

COMMENT ON COLUMN public.users.summary_emails_enabled IS
  'One-click unsubscribe for parent summary emails. Never gates invite or account email.';

-- Existing users predate the browser capture and are all Israeli pilot accounts.
UPDATE public.users SET timezone = 'Asia/Jerusalem' WHERE timezone IS NULL;

CREATE TABLE IF NOT EXISTS public.parent_email_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id     text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- The parent's LOCAL date the email is about, not the UTC instant it was sent.
  -- Keyed on the local date so a parent near midnight can't be sent twice.
  sent_for_date date NOT NULL,
  kind          text NOT NULL,
  topic_title   text,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parent_email_log_kind_check CHECK (kind IN ('topic', 'progress', 'nudge'))
);

-- The one-per-day guarantee.
CREATE UNIQUE INDEX IF NOT EXISTS parent_email_log_once_per_day
  ON public.parent_email_log (parent_id, sent_for_date);

CREATE INDEX IF NOT EXISTS parent_email_log_parent_sent_at
  ON public.parent_email_log (parent_id, sent_at DESC);

COMMENT ON TABLE public.parent_email_log IS
  'One row per summary email sent. The unique index on (parent_id, sent_for_date) is the one-per-day guarantee — do not enforce this in application code instead.';
