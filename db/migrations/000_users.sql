-- db/migrations/000_users.sql
-- Users table (Postgres). Idempotent and safe to re-run.

-- Enable UUID helper
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT DEFAULT '',
  last_name  TEXT DEFAULT '',
  password_hash TEXT,
  shopify_linked BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{}'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  progress JSONB DEFAULT '{}'::jsonb,
  activity_log JSONB DEFAULT '[]'::jsonb,
  huey_memory JSONB DEFAULT '{}'::jsonb,
  memorials JSONB DEFAULT '[]'::jsonb,
  wishlist JSONB DEFAULT '[]'::jsonb,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helpful index for email lookups (unique already covers, but safe if constraint missing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (email);
