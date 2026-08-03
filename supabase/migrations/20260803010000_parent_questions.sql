-- Dinner-table questions a parent can ask their child about a finished topic.
--
-- The parent dashboard answers "how is my child performing" in a vocabulary no
-- parent has. It never answers the question a parent actually has: what did my
-- child learn, and what do I say to them about it tonight?
--
-- Three questions per completed topic, generated once from what the child
-- actually said (planet_summary_goals.conversation_evidence / student_addition)
-- and never regenerated. Generation is best-effort at planet completion, so an
-- empty array is a normal state — an AI outage must never block a child from
-- finishing a topic. The UI degrades to the topic recap with no question block.
--
-- Shape: [{ "question": "..." }, ...] — an array of objects rather than bare
-- strings so a later addition (a category, a difficulty hint) doesn't require
-- rewriting every stored row.
--
-- Mirrored at prisma/migrations/20260803010000_parent_questions/ so that
-- `prisma migrate deploy` applies it during the Vercel build. Both are
-- idempotent: whichever runs first wins and the other is a no-op.

ALTER TABLE public.planet_summaries
  ADD COLUMN IF NOT EXISTS parent_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.planet_summaries.parent_questions IS
  'Up to 3 dinner-table questions for the parent, in the student''s language. Generated once at planet completion from the child''s own words; never regenerated. Empty array is normal — generation is best-effort and must never block completion.';
