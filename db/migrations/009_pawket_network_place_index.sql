-- db/migrations/009_pawket_network_place_index.sql
-- Public place/town centroid index for Pawket Network radius-search autocomplete.

CREATE TABLE IF NOT EXISTS network_place_index (
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  source_year INTEGER,
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  state TEXT NOT NULL,
  place_kind TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_network_place_index_name_prefix
  ON network_place_index (LOWER(name) text_pattern_ops, state);

CREATE INDEX IF NOT EXISTS idx_network_place_index_state_name
  ON network_place_index (state, LOWER(name) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_network_place_index_kind
  ON network_place_index (place_kind);
