-- db/migrations/005_pawket_network.sql
-- Pawket Network + Pawket Partners Ops schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_listing_status') THEN
    CREATE TYPE network_listing_status AS ENUM ('unclaimed', 'claimed', 'partner');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_claim_status') THEN
    CREATE TYPE network_claim_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_partner_tier') THEN
    CREATE TYPE network_partner_tier AS ENUM ('partner', 'partner_plus', 'partner_elite');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_primary_category') THEN
    CREATE TYPE network_primary_category AS ENUM ('vet', 'groomer', 'shelter', 'trainer', 'boarding', 'sitter', 'walker', 'daycare', 'rescue', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_portal_mode') THEN
    CREATE TYPE network_portal_mode AS ENUM ('internal_profile', 'external_site');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_lead_destination') THEN
    CREATE TYPE network_lead_destination AS ENUM ('email', 'webhook', 'both');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_charm_program_type') THEN
    CREATE TYPE network_charm_program_type AS ENUM ('donates', 'matches', 'campaign_partner');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_membership_role') THEN
    CREATE TYPE network_membership_role AS ENUM ('owner', 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'network_membership_status') THEN
    CREATE TYPE network_membership_status AS ENUM ('active', 'pending', 'revoked');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS network_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_primary network_primary_category NOT NULL,
  categories TEXT[] DEFAULT '{}'::text[],

  address_line1 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  service_area_radius_mi INTEGER,

  phone TEXT,
  website_url TEXT,

  short_description TEXT,
  description TEXT,
  hours_text TEXT,

  status network_listing_status NOT NULL DEFAULT 'unclaimed',
  partner_tier network_partner_tier,
  partner_since DATE,

  claim_status network_claim_status NOT NULL DEFAULT 'pending',
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  claim_verified_at TIMESTAMPTZ,

  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  business_identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  manual_review_passed BOOLEAN NOT NULL DEFAULT FALSE,

  enable_lead_form BOOLEAN NOT NULL DEFAULT FALSE,
  enable_offers BOOLEAN NOT NULL DEFAULT FALSE,
  enable_priority_rank BOOLEAN NOT NULL DEFAULT FALSE,
  enable_featured_slots BOOLEAN NOT NULL DEFAULT FALSE,

  lead_destination network_lead_destination NOT NULL DEFAULT 'email',
  lead_email TEXT,
  lead_webhook_url TEXT,

  portal_mode network_portal_mode NOT NULL DEFAULT 'internal_profile',
  external_site_url TEXT,

  charm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  charm_program_type network_charm_program_type,
  charm_public_blurb TEXT,
  charm_receipt_url TEXT,
  charm_match_cap_monthly NUMERIC(10,2),

  featured_rank INTEGER,
  cover_image_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_listing_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_listing_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_from NUMERIC(10,2),
  price_to NUMERIC(10,2),
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_listing_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_listing_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT,
  details TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_listing_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role network_membership_role NOT NULL,
  status network_membership_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, user_id)
);

CREATE TABLE IF NOT EXISTS network_claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_email TEXT,
  phone TEXT,
  business_identity_doc_url TEXT,
  business_identity_doc_path TEXT,
  status network_claim_status NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS network_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  source_page TEXT,
  source_path TEXT,
  destination network_lead_destination,
  delivery_status TEXT NOT NULL DEFAULT 'queued',
  delivery_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_geocode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_key TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  provider TEXT NOT NULL DEFAULT 'nominatim',
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_ops_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  granted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES network_listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_listings_status ON network_listings(status);
CREATE INDEX IF NOT EXISTS idx_network_listings_tier ON network_listings(partner_tier);
CREATE INDEX IF NOT EXISTS idx_network_listings_category ON network_listings(category_primary);
CREATE INDEX IF NOT EXISTS idx_network_listings_state ON network_listings(state);
CREATE INDEX IF NOT EXISTS idx_network_listings_featured ON network_listings(featured_rank);
CREATE INDEX IF NOT EXISTS idx_network_listings_lat_lng ON network_listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_network_listings_categories_gin ON network_listings USING GIN (categories);

CREATE INDEX IF NOT EXISTS idx_network_claim_requests_status ON network_claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_network_claim_requests_listing ON network_claim_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_network_claim_requests_requested_by ON network_claim_requests(requested_by_user_id);

CREATE INDEX IF NOT EXISTS idx_network_leads_listing_created ON network_leads(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_activity_listing_created ON network_activity_events(listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_network_memberships_user_status ON network_listing_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_network_memberships_listing_status ON network_listing_memberships(listing_id, status);