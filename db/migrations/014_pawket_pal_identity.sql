-- db/migrations/014_pawket_pal_identity.sql
-- Pawket Pal identity foundation: HeartCodes, privacy, consent, and guarded
-- future edition/transfer metadata.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pawket_pal_class') THEN
    CREATE TYPE pawket_pal_class AS ENUM ('honorary', 'community', 'limited_edition', 'one_of_one');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pawket_pal_privacy_state') THEN
    CREATE TYPE pawket_pal_privacy_state AS ENUM ('private', 'shareable', 'public', 'protected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pawket_pal_consent_state') THEN
    CREATE TYPE pawket_pal_consent_state AS ENUM ('not_requested', 'pending', 'granted', 'revoked', 'review_required');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pawket_pal_release_state') THEN
    CREATE TYPE pawket_pal_release_state AS ENUM ('draft', 'review', 'active', 'archived', 'locked');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pawket_pal_rarity_tier') THEN
    CREATE TYPE pawket_pal_rarity_tier AS ENUM ('family', 'rescue', 'legacy', 'guardian', 'founders', 'one_of_one');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pawket_pal_origin_type') THEN
    CREATE TYPE pawket_pal_origin_type AS ENUM (
      'pet_profile',
      'journal_entry',
      'story_submission',
      'charm_case',
      'community_moment',
      'manual'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pawket_pal_heartcode_event_type') THEN
    CREATE TYPE pawket_pal_heartcode_event_type AS ENUM (
      'issued',
      'claimed',
      'updated',
      'consent_updated',
      'quest_completed',
      'perk_unlocked',
      'transfer_locked',
      'transfer_unlocked',
      'transfer_recorded',
      'retired'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS pawket_pals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heartcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,

  pal_class pawket_pal_class NOT NULL DEFAULT 'honorary',
  rarity_tier pawket_pal_rarity_tier,
  privacy_state pawket_pal_privacy_state NOT NULL DEFAULT 'private',
  consent_state pawket_pal_consent_state NOT NULL DEFAULT 'not_requested',
  release_state pawket_pal_release_state NOT NULL DEFAULT 'draft',
  origin_type pawket_pal_origin_type NOT NULL DEFAULT 'manual',

  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  inspired_by_pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  source_journal_entry_id UUID REFERENCES pet_journal(id) ON DELETE SET NULL,

  origin_summary TEXT,
  public_story_summary TEXT,
  internal_story_notes TEXT,

  edition_name TEXT,
  edition_code TEXT,
  edition_number INTEGER,
  edition_size INTEGER,
  release_event TEXT,

  charm_alignment TEXT,
  cherish_alignment TEXT,
  charm_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  cherish_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  traits JSONB NOT NULL DEFAULT '{}'::jsonb,
  game_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  quest_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  perks JSONB NOT NULL DEFAULT '{}'::jsonb,

  transfer_locked BOOLEAN NOT NULL DEFAULT TRUE,
  market_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  market_notes TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pawket_pals_heartcode_format
    CHECK (heartcode = UPPER(heartcode) AND heartcode ~ '^PAL-[A-Z0-9][A-Z0-9-]{6,}$'),
  CONSTRAINT pawket_pals_edition_positive
    CHECK (
      (edition_number IS NULL OR edition_number > 0)
      AND (edition_size IS NULL OR edition_size > 0)
      AND (edition_number IS NULL OR edition_size IS NULL OR edition_number <= edition_size)
    ),
  CONSTRAINT pawket_pals_one_of_one_guard
    CHECK (
      pal_class <> 'one_of_one'
      OR (
        privacy_state IN ('private', 'protected')
        AND transfer_locked IS TRUE
        AND market_enabled IS FALSE
      )
    ),
  CONSTRAINT pawket_pals_market_guard
    CHECK (
      market_enabled IS FALSE
      OR (
        pal_class IN ('community', 'limited_edition')
        AND privacy_state = 'public'
        AND consent_state = 'granted'
        AND transfer_locked IS FALSE
      )
    ),
  CONSTRAINT pawket_pals_public_story_guard
    CHECK (public_story_summary IS NULL OR consent_state IN ('pending', 'granted', 'review_required'))
);

CREATE TABLE IF NOT EXISTS pawket_pal_story_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pal_id UUID NOT NULL REFERENCES pawket_pals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES pet_journal(id) ON DELETE SET NULL,

  status pawket_pal_consent_state NOT NULL DEFAULT 'pending',
  allow_private_pal BOOLEAN NOT NULL DEFAULT TRUE,
  allow_public_story BOOLEAN NOT NULL DEFAULT FALSE,
  allow_community_pal BOOLEAN NOT NULL DEFAULT FALSE,
  allow_charm_connection BOOLEAN NOT NULL DEFAULT FALSE,
  allow_cherish_connection BOOLEAN NOT NULL DEFAULT FALSE,
  allow_marketing_use BOOLEAN NOT NULL DEFAULT FALSE,
  allow_transfer BOOLEAN NOT NULL DEFAULT FALSE,

  consent_text TEXT,
  review_notes TEXT,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pawket_pal_story_consents_private_or_requested
    CHECK (
      allow_private_pal IS TRUE
      OR allow_public_story IS TRUE
      OR allow_community_pal IS TRUE
      OR allow_charm_connection IS TRUE
      OR allow_cherish_connection IS TRUE
      OR allow_marketing_use IS TRUE
      OR allow_transfer IS TRUE
    ),
  CONSTRAINT pawket_pal_story_consents_granted_at_guard
    CHECK ((status = 'granted' AND granted_at IS NOT NULL) OR status <> 'granted'),
  CONSTRAINT pawket_pal_story_consents_revoked_at_guard
    CHECK ((status = 'revoked' AND revoked_at IS NOT NULL) OR status <> 'revoked')
);

CREATE TABLE IF NOT EXISTS pawket_pal_heartcode_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pal_id UUID NOT NULL REFERENCES pawket_pals(id) ON DELETE CASCADE,
  heartcode TEXT NOT NULL,
  event_type pawket_pal_heartcode_event_type NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pawket_pal_heartcode_events_heartcode_format
    CHECK (heartcode = UPPER(heartcode) AND heartcode ~ '^PAL-[A-Z0-9][A-Z0-9-]{6,}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pawket_pals_edition_unique
  ON pawket_pals(edition_code, edition_number)
  WHERE edition_code IS NOT NULL AND edition_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pawket_pals_owner_created
  ON pawket_pals(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pawket_pals_pet_created
  ON pawket_pals(inspired_by_pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pawket_pals_class_release
  ON pawket_pals(pal_class, release_state);
CREATE INDEX IF NOT EXISTS idx_pawket_pals_privacy_consent
  ON pawket_pals(privacy_state, consent_state);
CREATE INDEX IF NOT EXISTS idx_pawket_pals_traits_gin
  ON pawket_pals USING GIN (traits);

CREATE INDEX IF NOT EXISTS idx_pawket_pal_story_consents_pal_created
  ON pawket_pal_story_consents(pal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pawket_pal_story_consents_user_created
  ON pawket_pal_story_consents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pawket_pal_story_consents_status
  ON pawket_pal_story_consents(status);

CREATE INDEX IF NOT EXISTS idx_pawket_pal_heartcode_events_pal_created
  ON pawket_pal_heartcode_events(pal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pawket_pal_heartcode_events_actor_created
  ON pawket_pal_heartcode_events(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pawket_pal_heartcode_events_type_created
  ON pawket_pal_heartcode_events(event_type, created_at DESC);

DROP TRIGGER IF EXISTS pawket_pals_touch_updated_at ON pawket_pals;
CREATE TRIGGER pawket_pals_touch_updated_at
BEFORE UPDATE ON pawket_pals
FOR EACH ROW
EXECUTE FUNCTION pp_touch_updated_at();

DROP TRIGGER IF EXISTS pawket_pal_story_consents_touch_updated_at ON pawket_pal_story_consents;
CREATE TRIGGER pawket_pal_story_consents_touch_updated_at
BEFORE UPDATE ON pawket_pal_story_consents
FOR EACH ROW
EXECUTE FUNCTION pp_touch_updated_at();
