-- Migration: student_inventory
-- student_id is text (matches public.users.id type).
-- category stored alongside item_id for efficient per-category equip queries.

CREATE TABLE IF NOT EXISTS student_inventory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     text NOT NULL,
  category    text NOT NULL,
  is_equipped boolean NOT NULL DEFAULT true,
  acquired_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (student_id, item_id)
);

ALTER TABLE student_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_read_own_inventory"
  ON student_inventory FOR SELECT
  USING (auth.uid()::text = student_id);

CREATE POLICY "student_update_own_equipped"
  ON student_inventory FOR UPDATE
  USING (auth.uid()::text = student_id)
  WITH CHECK (auth.uid()::text = student_id);
