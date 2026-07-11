-- Migration: atomic_store_equip
-- The equip route used to unequip everything and then equip the target in two
-- separate statements. Two rapid equips (item A then item B) could interleave
-- so A's late "unequip-all" landed after B's equip, leaving nothing equipped
-- while the UI showed one item. This function resolves the toggle in a single
-- transaction: one UPDATE sets the target row and clears every other row.
--
-- SECURITY INVOKER (default) on purpose: only service_role (the API routes)
-- may execute it, and service_role already holds the table grants.

CREATE OR REPLACE FUNCTION public.equip_store_item(
  p_student_id text,
  p_item_id    text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_was_equipped boolean;
BEGIN
  -- Lock the target row so concurrent equips for the same student serialise.
  SELECT is_equipped INTO v_was_equipped
    FROM student_inventory
   WHERE student_id = p_student_id
     AND item_id    = p_item_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_owned');
  END IF;

  -- Single-slot toggle in one statement: equipping an unequipped item sets it
  -- true and everything else false; equipping an equipped item empties the slot.
  UPDATE student_inventory
     SET is_equipped = (item_id = p_item_id AND NOT v_was_equipped)
   WHERE student_id = p_student_id
     AND (is_equipped OR item_id = p_item_id);

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.equip_store_item(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.equip_store_item(text, text)
  TO service_role;
