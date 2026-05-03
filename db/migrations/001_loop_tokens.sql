-- Loop Tokens + CHARM ledger (idempotent)

-- User summary fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS charm_points INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Loop tokens
CREATE TABLE IF NOT EXISTS loop_tokens (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_redeemed_at TIMESTAMPTZ,
  shown_at TIMESTAMPTZ,
  chain_length INT DEFAULT 1,
  status TEXT DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS loop_tokens_created_by_idx ON loop_tokens(created_by_user_id);
CREATE INDEX IF NOT EXISTS loop_tokens_created_order_idx ON loop_tokens(created_order_id);

-- Loop token chain links
CREATE TABLE IF NOT EXISTS loop_token_links (
  id BIGSERIAL PRIMARY KEY,
  token_id BIGINT REFERENCES loop_tokens(id) ON DELETE CASCADE,
  position INT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id TEXT,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (token_id, user_id)
);

CREATE INDEX IF NOT EXISTS loop_token_links_token_idx ON loop_token_links(token_id);
CREATE INDEX IF NOT EXISTS loop_token_links_user_idx ON loop_token_links(user_id);

-- CHARM ledger
CREATE TABLE IF NOT EXISTS charm_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT NOT NULL,
  token_id BIGINT REFERENCES loop_tokens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS charm_ledger_user_idx ON charm_ledger(user_id);
CREATE INDEX IF NOT EXISTS charm_ledger_reason_idx ON charm_ledger(reason);
