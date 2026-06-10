-- =============================================================================
-- Seed: Test students enrolled in Ayana's journey with varied signal types
--
-- Teacher:  ayana6@gmail.com  (user id: d958e9c3-3744-4076-be07-34d13448045b)
-- Journey:  looked up dynamically via teacher_id below
--
-- Signal distribution across 7 students:
--   Oru-Zero  (Jordan)       → breakthrough       [SIGNAL:breakthrough]
--   Xylo-9    (ayana.stud)   → grace_completion   [SIGNAL:grace_completion]
--   Nyx-X     (Sam)          → stuck              [SIGNAL:stuck]
--   Kael-Prime (Alex)        → stuck              [SIGNAL:stuck]
--   Grix-Sol  (Riley)        → non_engagement     (no messages)
--   Zara-Arc  (Casey)        → non_engagement     (no messages)
--   Phos-Ren  (Morgan)       → non_engagement     (no messages)
--
-- The [SIGNAL:xxx] messages are read by generateSignals() in the homescreen API
-- as test overrides. Remove them once planet_summaries pipeline is live.
-- =============================================================================

DO $$
DECLARE
  v_journey_id TEXT;
  v_mission_id TEXT;
BEGIN

  -- -------------------------------------------------------------------------
  -- 1. Resolve Ayana's journey
  -- -------------------------------------------------------------------------
  SELECT id INTO v_journey_id
  FROM journeys
  WHERE teacher_id = 'd958e9c3-3744-4076-be07-34d13448045b'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_journey_id IS NULL THEN
    RAISE EXCEPTION 'No journey found for teacher ayana6@gmail.com. Create one first via the teacher portal.';
  END IF;

  RAISE NOTICE 'Using journey_id: %', v_journey_id;

  -- -------------------------------------------------------------------------
  -- 2. Resolve the first mission in the journey
  -- -------------------------------------------------------------------------
  SELECT id INTO v_mission_id
  FROM missions
  WHERE journey_id = v_journey_id
  ORDER BY "order" ASC
  LIMIT 1;

  IF v_mission_id IS NULL THEN
    RAISE EXCEPTION 'No missions found in journey %. Activate the journey first.', v_journey_id;
  END IF;

  RAISE NOTICE 'Using mission_id: %', v_mission_id;

  -- -------------------------------------------------------------------------
  -- 3. Enroll students in the journey (student_journeys)
  --    Uses INSERT … ON CONFLICT DO NOTHING so it's safe to re-run.
  -- -------------------------------------------------------------------------
  INSERT INTO student_journeys (id, student_id, journey_id, enrolled_at)
  VALUES
    (gen_random_uuid()::text, '21ee7b38-b9ab-42a8-a22f-eca99f04e6a1', v_journey_id, NOW() - INTERVAL '7 days'),  -- Jordan / Oru-Zero
    (gen_random_uuid()::text, '2dfd9954-54ff-49c9-92f9-ebebb0b0b378', v_journey_id, NOW() - INTERVAL '7 days'),  -- ayana.student / Xylo-9
    (gen_random_uuid()::text, '358a1c5a-c9ca-41c4-b8ff-f24503854dfe', v_journey_id, NOW() - INTERVAL '7 days'),  -- Sam / Nyx-X
    (gen_random_uuid()::text, '3a538671-18e0-43a3-9740-4f742245db7a', v_journey_id, NOW() - INTERVAL '7 days'),  -- Alex / Kael-Prime
    (gen_random_uuid()::text, '459cd009-bb3b-4627-9ca4-f82abd5a2979', v_journey_id, NOW() - INTERVAL '7 days'),  -- Riley / Grix-Sol
    (gen_random_uuid()::text, '9491a7b7-00dc-498d-91ad-708894faf415', v_journey_id, NOW() - INTERVAL '7 days'),  -- Casey / Zara-Arc
    (gen_random_uuid()::text, 'd68f67ae-413b-432a-ae07-fd37f6a7694d', v_journey_id, NOW() - INTERVAL '7 days')   -- Morgan / Phos-Ren
  ON CONFLICT (student_id, journey_id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 4. Mark each student as having started the mission
  --    Back-dated so they appear as "engaged some days ago"
  -- -------------------------------------------------------------------------
  INSERT INTO mission_started_by_student (id, student_id, mission_id, status, created_at)
  VALUES
    (gen_random_uuid()::text, '21ee7b38-b9ab-42a8-a22f-eca99f04e6a1', v_mission_id, 'started', NOW() - INTERVAL '4 days'),
    (gen_random_uuid()::text, '2dfd9954-54ff-49c9-92f9-ebebb0b0b378', v_mission_id, 'started', NOW() - INTERVAL '5 days'),
    (gen_random_uuid()::text, '358a1c5a-c9ca-41c4-b8ff-f24503854dfe', v_mission_id, 'started', NOW() - INTERVAL '3 days'),
    (gen_random_uuid()::text, '3a538671-18e0-43a3-9740-4f742245db7a', v_mission_id, 'started', NOW() - INTERVAL '6 days'),
    (gen_random_uuid()::text, '459cd009-bb3b-4627-9ca4-f82abd5a2979', v_mission_id, 'started', NOW() - INTERVAL '5 days'),
    (gen_random_uuid()::text, '9491a7b7-00dc-498d-91ad-708894faf415', v_mission_id, 'started', NOW() - INTERVAL '4 days'),
    (gen_random_uuid()::text, 'd68f67ae-413b-432a-ae07-fd37f6a7694d', v_mission_id, 'started', NOW() - INTERVAL '3 days')
  ON CONFLICT (student_id, mission_id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 5. Seed test signal override messages
  --
  --    These drive the signal type shown on the homescreen spotlight.
  --    Format: [SIGNAL:type] — read by generateSignals() in homescreen API.
  --    The student_id here is the UUID from the `students` table (NOT users.id).
  --    NOTE: messages.student_id references students.id (Supabase UUID column).
  --    If the student UUIDs below don't match your students table, update them
  --    using: SELECT id FROM students WHERE alien_name = 'Oru-Zero';
  -- -------------------------------------------------------------------------

  -- Jordan / Oru-Zero → BREAKTHROUGH
  INSERT INTO messages (id, student_id, role, content, created_at)
  VALUES (
    gen_random_uuid(),
    '21ee7b38-b9ab-42a8-a22f-eca99f04e6a1'::uuid,
    'student',
    '[SIGNAL:breakthrough] Jordan had a genuine moment of understanding about the core concept today.',
    NOW() - INTERVAL '2 days'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ayana.student / Xylo-9 → GRACE COMPLETION
  INSERT INTO messages (id, student_id, role, content, created_at)
  VALUES (
    gen_random_uuid(),
    '2dfd9954-54ff-49c9-92f9-ebebb0b0b378'::uuid,
    'student',
    '[SIGNAL:grace_completion] Completed the planet via grace threshold without demonstrating understanding.',
    NOW() - INTERVAL '3 days'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Sam / Nyx-X → STUCK
  INSERT INTO messages (id, student_id, role, content, created_at)
  VALUES (
    gen_random_uuid(),
    '358a1c5a-c9ca-41c4-b8ff-f24503854dfe'::uuid,
    'student',
    '[SIGNAL:stuck] Sam has been exploring but the concept is not landing.',
    NOW() - INTERVAL '1 day'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Alex / Kael-Prime → STUCK
  INSERT INTO messages (id, student_id, role, content, created_at)
  VALUES (
    gen_random_uuid(),
    '3a538671-18e0-43a3-9740-4f742245db7a'::uuid,
    'student',
    '[SIGNAL:stuck] Alex keeps circling the same idea without breaking through.',
    NOW() - INTERVAL '2 days'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Riley, Casey, Morgan → NON_ENGAGEMENT (no messages seeded — silence triggers it)

  RAISE NOTICE 'Seed complete. Signal distribution:';
  RAISE NOTICE '  Oru-Zero  (Jordan)      → breakthrough';
  RAISE NOTICE '  Xylo-9    (ayana.stud)  → grace_completion';
  RAISE NOTICE '  Nyx-X     (Sam)         → stuck';
  RAISE NOTICE '  Kael-Prime (Alex)       → stuck';
  RAISE NOTICE '  Grix-Sol  (Riley)       → non_engagement';
  RAISE NOTICE '  Zara-Arc  (Casey)       → non_engagement';
  RAISE NOTICE '  Phos-Ren  (Morgan)      → non_engagement';

END $$;
