-- db/migrations/008_pawket_network_import_candidates.sql
-- Source-data staging for real Pawket Network listing candidates.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_import_candidate_status') THEN
    CREATE TYPE network_import_candidate_status AS ENUM ('new', 'needs_review', 'approved', 'rejected', 'promoted');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS network_import_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_record_id TEXT,
  source_url TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  name TEXT NOT NULL,
  category_primary network_primary_category NOT NULL DEFAULT 'other',
  categories TEXT[] DEFAULT '{}'::text[],

  address_line1 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  phone TEXT,
  website_url TEXT,
  short_description TEXT,

  dedupe_key TEXT NOT NULL,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  confidence_reasons TEXT[] DEFAULT '{}'::text[],

  match_listing_id UUID REFERENCES network_listings(id) ON DELETE SET NULL,
  promoted_listing_id UUID REFERENCES network_listings(id) ON DELETE SET NULL,
  status network_import_candidate_status NOT NULL DEFAULT 'new',
  review_notes TEXT,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  promoted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_network_import_candidates_source_dedupe
  ON network_import_candidates(source, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_network_import_candidates_status_created
  ON network_import_candidates(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_network_import_candidates_source
  ON network_import_candidates(source);

CREATE INDEX IF NOT EXISTS idx_network_import_candidates_location
  ON network_import_candidates(state, city);

CREATE INDEX IF NOT EXISTS idx_network_import_candidates_category
  ON network_import_candidates(category_primary);

CREATE INDEX IF NOT EXISTS idx_network_import_candidates_confidence
  ON network_import_candidates(confidence_score DESC);
