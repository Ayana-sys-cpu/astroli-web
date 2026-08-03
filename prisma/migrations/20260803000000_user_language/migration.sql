-- Give every person a language of their own.
--
-- Until now language existed only on an enrollment (classes.language), so every
-- surface outside a journey had to guess. The guess was literal: the student
-- home page read the language of whichever journey happened to sort first, and
-- Orin inherited that guess because it is handed a language by the calling page
-- rather than resolving one itself.
--
-- Language now belongs to the person, and enrollments inherit it. The
-- per-enrollment column stays: a Hebrew-speaking family taking an
-- English-language journey is a real product case and already works.
--
-- NOTHING READS THIS COLUMN YET. This migration ships alone, on purpose — a
-- wrong value here is invisible and harmless today, and unfixable once four
-- surfaces depend on it. The backfill is verified by name against
-- specs/shared/language/baseline.md before any reader ships.
--
-- Mirrored at prisma/migrations/20260803000000_user_language/ so that
-- `prisma migrate deploy` applies it during the Vercel build. Both are
-- idempotent: whichever runs first wins and the other is a no-op.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_language_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_language_check CHECK (language IN ('he', 'en'));
  END IF;
END $$;

COMMENT ON COLUMN public.users.language IS
  'This person''s language: ''he'' or ''en''. The single source of truth for app chrome, Orin, parent emails, and the default a new enrollment inherits. Read it only through lib/student-language.ts. Never derive language from missions.language — that column is template-global and shared by every family on the journey.';

-- ── Backfill, in dependency order ───────────────────────────────────────────
--
-- Order matters: parents read from their child, so students must be correct
-- first. Every live person keeps exactly the language they see today.

-- 1. Students with an enrollment take that enrollment's language.
--    No student holds more than one enrollment (verified at capture), so there
--    is no conflict to resolve. DISTINCT ON with an explicit order keeps this
--    deterministic anyway, should a second enrollment ever predate the fix.
UPDATE public.users u
SET language = e.language
FROM (
  SELECT DISTINCT ON (sc.student_id)
         sc.student_id,
         c.language
  FROM public.student_classes sc
  JOIN public.classes c ON c.id = sc.class_id
  WHERE c.language IN ('he', 'en')
  ORDER BY sc.student_id, sc.enrolled_at DESC, sc.id DESC
) e
WHERE u.id = e.student_id;

-- 2. Parents take their child's language.
UPDATE public.users p
SET language = c.language
FROM public.parent_child_link l
JOIN public.users c ON c.id = l.child_id
WHERE p.id = l.parent_id;

-- 3. Everyone else is an Israeli pilot account with no enrollment and no link.
UPDATE public.users u
SET language = 'he'
WHERE NOT EXISTS (SELECT 1 FROM public.student_classes sc WHERE sc.student_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.parent_child_link l WHERE l.parent_id = u.id);
