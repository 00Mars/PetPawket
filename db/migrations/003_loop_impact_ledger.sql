-- Impact ledger + rescue outcomes (idempotent)

-- Extend impact stories with funding fields
ALTER TABLE loop_impact_stories ADD COLUMN IF NOT EXISTS goal_amount NUMERIC(10,2) DEFAULT 250.00;
ALTER TABLE loop_impact_stories ADD COLUMN IF NOT EXISTS funded_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE loop_impact_stories ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE loop_impact_stories ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE loop_impact_stories ADD COLUMN IF NOT EXISTS priority INT DEFAULT 100;
ALTER TABLE loop_impact_stories ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE loop_impact_stories ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Ensure legacy rows are active by default
UPDATE loop_impact_stories
   SET status = 'active'
 WHERE status IS NULL;

-- Impact ledger table
CREATE TABLE IF NOT EXISTS loop_impact_ledger (
  id BIGSERIAL PRIMARY KEY,
  token_id BIGINT REFERENCES loop_tokens(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id TEXT,
  case_id BIGINT REFERENCES loop_impact_stories(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  base_amount NUMERIC(10,2) NOT NULL,
  percent_amount NUMERIC(10,2) NOT NULL,
  percent_rate NUMERIC(5,4) NOT NULL,
  order_subtotal NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS loop_impact_ledger_order_token_uniq
  ON loop_impact_ledger(order_id, token_id);

CREATE INDEX IF NOT EXISTS loop_impact_ledger_case_idx ON loop_impact_ledger(case_id);
CREATE INDEX IF NOT EXISTS loop_impact_ledger_user_idx ON loop_impact_ledger(user_id);
CREATE INDEX IF NOT EXISTS loop_impact_ledger_created_idx ON loop_impact_ledger(created_at);

CREATE INDEX IF NOT EXISTS loop_impact_stories_status_idx ON loop_impact_stories(status);
CREATE INDEX IF NOT EXISTS loop_impact_stories_priority_idx ON loop_impact_stories(priority);
