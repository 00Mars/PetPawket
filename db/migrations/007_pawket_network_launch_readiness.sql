-- db/migrations/007_pawket_network_launch_readiness.sql
-- Launch-safe Pawket Network nominations and placeholder seed cleanup.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_nomination_status') THEN
    CREATE TYPE network_nomination_status AS ENUM ('pending', 'reviewed', 'dismissed', 'converted');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS network_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  category_primary network_primary_category NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  website_url TEXT,
  phone TEXT,
  nominator_email TEXT,
  note TEXT,
  status network_nomination_status NOT NULL DEFAULT 'pending',
  source_path TEXT,
  review_notes TEXT,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_nominations_status_created ON network_nominations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_nominations_location ON network_nominations(state, city);
CREATE INDEX IF NOT EXISTS idx_network_nominations_category ON network_nominations(category_primary);

-- Remove the original fake public seed records if they were imported before
-- launch data existed. These slugs were placeholder examples, not approved
-- provider data.
DELETE FROM network_listings
WHERE slug IN (
  'pawsome-grooming-oxford-ma',
  'oak-street-animal-clinic-providence-ri',
  'harbor-haven-shelter-new-bedford-ma'
);
