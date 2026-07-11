-- Migration: atomic_store_purchase
-- The purchase route used to read the balance, insert the inventory row and
-- write the new balance in three separate statements. Two near-simultaneous
-- purchases (fast clicks, or web + mobile) both read the same balance and
-- each deducted independently — last writer wins, so a student could get an
-- item without paying or end up with an inflated balance.
--
-- This function does the whole purchase in one transaction:
--   1. Conditional debit: UPDATE ... WHERE balance >= price. Concurrent
--      purchases serialise on the row lock, so the second one re-checks the
--      already-debited balance and fails cleanly if coins ran out.
--   2. Inventory insert AFTER the debit: if the item is already owned the
--      UNIQUE (student_id, item_id) constraint raises 23505, which aborts
--      the transaction and rolls the debit back.
--
-- SECURITY INVOKER (default) on purpose: only service_role (the API routes)
-- may execute it, and service_role already holds the table grants.

CREATE OR REPLACE FUNCTION public.purchase_store_item(
  p_student_id text,
  p_item_id    text,
  p_category   text,
  p_price      integer
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- Students who never earned coins have no balance row yet; create it at 0
  -- so the conditional debit below has a row to lock (and free items work).
  INSERT INTO student_coin_balances (student_id, balance)
  VALUES (p_student_id, 0)
  ON CONFLICT (student_id) DO NOTHING;

  UPDATE student_coin_balances
     SET balance    = balance - p_price,
         updated_at = now()
   WHERE student_id = p_student_id
     AND balance   >= p_price
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN jsonb_build_object(
      'status',  'insufficient_balance',
      'balance', (SELECT balance FROM student_coin_balances WHERE student_id = p_student_id)
    );
  END IF;

  -- Already owned → unique_violation (23505) propagates and rolls back the debit.
  INSERT INTO student_inventory (student_id, item_id, category, is_equipped)
  VALUES (p_student_id, p_item_id, p_category, true);

  -- Single-slot avatar: the new item replaces whatever was equipped before.
  UPDATE student_inventory
     SET is_equipped = false
   WHERE student_id = p_student_id
     AND is_equipped = true
     AND item_id    <> p_item_id;

  RETURN jsonb_build_object('status', 'ok', 'new_balance', v_new_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purchase_store_item(text, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_store_item(text, text, text, integer)
  TO service_role;
