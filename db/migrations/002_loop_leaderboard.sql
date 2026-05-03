-- Loop Tokens leaderboard + impact stories

CREATE TABLE IF NOT EXISTS loop_impact_stories (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pet_name TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loop_impact_active_idx ON loop_impact_stories(active);

CREATE TABLE IF NOT EXISTS loop_monthly_awards (
  id BIGSERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  award_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  token_id BIGINT REFERENCES loop_tokens(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb,
  UNIQUE (month, award_type)
);

CREATE INDEX IF NOT EXISTS loop_monthly_awards_month_idx ON loop_monthly_awards(month);
