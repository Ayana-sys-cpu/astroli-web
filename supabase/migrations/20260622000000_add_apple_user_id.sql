-- Add apple_user_id to support Sign in with Apple.
-- Nullable — existing Google-only users will have NULL here.
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_apple_user_id ON users (apple_user_id)
  WHERE apple_user_id IS NOT NULL;
