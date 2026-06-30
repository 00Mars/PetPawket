-- Speed up source-audit cleanup and listing deletes.

CREATE INDEX IF NOT EXISTS idx_network_import_candidates_promoted_listing
  ON network_import_candidates(promoted_listing_id);

CREATE INDEX IF NOT EXISTS idx_network_import_candidates_match_listing
  ON network_import_candidates(match_listing_id);

CREATE INDEX IF NOT EXISTS idx_network_listing_media_listing
  ON network_listing_media(listing_id);

CREATE INDEX IF NOT EXISTS idx_network_listing_services_listing
  ON network_listing_services(listing_id);

CREATE INDEX IF NOT EXISTS idx_network_listing_faqs_listing
  ON network_listing_faqs(listing_id);

CREATE INDEX IF NOT EXISTS idx_network_listing_offers_listing
  ON network_listing_offers(listing_id);

CREATE INDEX IF NOT EXISTS idx_network_claim_requests_listing
  ON network_claim_requests(listing_id);

CREATE INDEX IF NOT EXISTS idx_network_leads_listing
  ON network_leads(listing_id);

CREATE INDEX IF NOT EXISTS idx_network_activity_events_listing
  ON network_activity_events(listing_id);
