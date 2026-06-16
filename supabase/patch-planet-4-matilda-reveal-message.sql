-- ─────────────────────────────────────────────────────────────
-- Patch: Fix student_reveal_message for Planet 4 (Matilda of Tuscany)
-- ─────────────────────────────────────────────────────────────
-- Run in: astroli-web Supabase project → SQL Editor
--
-- Problem: the pre-filled student opening message for this planet
-- incorrectly described Matilda as "the pope" and "a religious leader."
-- Matilda of Tuscany is the Countess of Tuscany (a secular feudal ruler),
-- not a religious figure. She hosted the Canossa encounter and brokered
-- the meeting between Henry IV and Gregory VII.
--
-- This patch sets the correct student_reveal_message for planet 4.
-- ─────────────────────────────────────────────────────────────

UPDATE planets
SET student_reveal_message = 'You don''t just host this meeting — historians still talk about what happened here a thousand years from now. You''re the Countess who convinced a pope to forgive an emperor, and brought the most powerful ruler in Europe to kneel at your gates. I''m here to understand how you made Canossa happen.'
WHERE id = '3c2af099-2960-4515-90fe-163d0740053e';
