-- db/migrations/016_password_reset_tokens.sql
-- One-time password reset token store. Tokens are stored as hashes only.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_unused
  ON password_reset_tokens (user_id, expires_at)
  WHERE used_at IS NULL;
