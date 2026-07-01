-- Migration: student_coin_balances
-- student_id is text (matches public.users.id type).
-- All writes go through service-role API routes — no direct client writes.

CREATE TABLE IF NOT EXISTS student_coin_balances (
  student_id  text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance     integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE student_coin_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_read_own_balance"
  ON student_coin_balances FOR SELECT
  USING (auth.uid()::text = student_id);
