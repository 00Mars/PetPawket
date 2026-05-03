-- apps/charmfoundation/db/migrations/000_cf_core.sql
-- Core CHARM Foundation tables (idempotent, additive)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cf_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_type TEXT,
  status TEXT DEFAULT 'active',
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_partner_intakes (
  id BIGSERIAL PRIMARY KEY,
  org_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  org_type TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  interests TEXT[] DEFAULT '{}'::text[],
  availability TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_volunteer_applications (
  id BIGSERIAL PRIMARY KEY,
  volunteer_id UUID REFERENCES cf_volunteers(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  interests TEXT[] DEFAULT '{}'::text[],
  availability TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_cases (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  goal_amount NUMERIC(10,2) DEFAULT 0,
  funded_amount NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_case_updates (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT REFERENCES cf_cases(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_case_documents (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT REFERENCES cf_cases(id) ON DELETE CASCADE,
  doc_type TEXT,
  url TEXT,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_case_highlights (
  id BIGSERIAL PRIMARY KEY,
  case_id BIGINT REFERENCES cf_cases(id) ON DELETE SET NULL,
  title TEXT,
  body TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ,
  location TEXT,
  status TEXT DEFAULT 'scheduled',
  capacity INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_event_rsvps (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES cf_events(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  attendees INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_donation_funds (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_donations (
  id BIGSERIAL PRIMARY KEY,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  fund_id BIGINT REFERENCES cf_donation_funds(id) ON DELETE SET NULL,
  donor_name TEXT,
  donor_email TEXT,
  donor_phone TEXT,
  note TEXT,
  status TEXT DEFAULT 'pledged',
  provider TEXT,
  provider_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_donation_allocations (
  id BIGSERIAL PRIMARY KEY,
  donation_id BIGINT REFERENCES cf_donations(id) ON DELETE CASCADE,
  case_id BIGINT REFERENCES cf_cases(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_donor_receipts (
  id BIGSERIAL PRIMARY KEY,
  donation_id BIGINT REFERENCES cf_donations(id) ON DELETE CASCADE,
  receipt_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_impact_receipts (
  id BIGSERIAL PRIMARY KEY,
  month TEXT,
  summary JSONB DEFAULT '{}'::jsonb,
  total_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_newsletter_signups (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  interests TEXT,
  frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cf_contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL,
  topic TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cf_cases_status_idx ON cf_cases(status);
CREATE INDEX IF NOT EXISTS cf_cases_featured_idx ON cf_cases(featured);
CREATE INDEX IF NOT EXISTS cf_case_updates_case_idx ON cf_case_updates(case_id);
CREATE INDEX IF NOT EXISTS cf_event_rsvps_event_idx ON cf_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS cf_donations_fund_idx ON cf_donations(fund_id);
CREATE INDEX IF NOT EXISTS cf_newsletter_email_idx ON cf_newsletter_signups(email);
CREATE INDEX IF NOT EXISTS cf_contact_email_idx ON cf_contact_messages(email);

INSERT INTO cf_donation_funds (name, code, description)
VALUES
  ('Urgent Medical Care', 'urgent-care', 'Emergency vet visits, surgeries, and immediate care.'),
  ('Rescue Missions', 'rescue-missions', 'Transport, rescue operations, and safety gear.'),
  ('Placement Support', 'placement-support', 'Foster support, supplies, and rehoming.'),
  ('Memorial Support', 'memorial-support', 'Grief support and memorial programs for families.')
ON CONFLICT (code) DO NOTHING;
