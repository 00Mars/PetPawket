-- db/migrations/006_runtime_schema_alignment.sql
-- Additive compatibility bridge for the active Express runtime.
--
-- Earlier migrations provisioned part of the pets schema and a generic
-- pet_journal_entries table. The current server code reads/writes:
--   - pets.user_id / pets.birthday / pets.avatar / pet preference columns
--   - addresses
--   - pet_journal
--
-- This migration does not rename or drop legacy tables. It only adds the
-- runtime tables/columns needed by the current API surface.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION pp_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Pets runtime contract
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.pets') IS NULL THEN
    CREATE TABLE pets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      customer_email TEXT,
      name TEXT NOT NULL,
      species TEXT,
      breed TEXT,
      birthday DATE,
      birthdate DATE,
      sex TEXT,
      spayed_neutered BOOLEAN,
      weight_kg NUMERIC(5,2),
      size TEXT,
      chew_strength INTEGER,
      allergies TEXT[] DEFAULT '{}'::text[],
      dislikes TEXT[] DEFAULT '{}'::text[],
      toy_prefs TEXT[] DEFAULT '{}'::text[],
      food_prefs TEXT[] DEFAULT '{}'::text[],
      notes TEXT,
      avatar TEXT,
      traits JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END$$;

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS birthdate DATE,
  ADD COLUMN IF NOT EXISTS avatar TEXT,
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS spayed_neutered BOOLEAN,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS chew_strength INTEGER,
  ADD COLUMN IF NOT EXISTS allergies TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS dislikes TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS toy_prefs TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS food_prefs TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS traits JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE pets
   SET user_id = users.id
  FROM users
 WHERE pets.user_id IS NULL
   AND pets.customer_email IS NOT NULL
   AND LOWER(pets.customer_email) = LOWER(users.email);

UPDATE pets
   SET birthday = COALESCE(birthday, birthdate),
       birthdate = COALESCE(birthdate, birthday),
       traits = COALESCE(traits, '{}'::jsonb),
       allergies = COALESCE(allergies, '{}'::text[]),
       dislikes = COALESCE(dislikes, '{}'::text[]),
       toy_prefs = COALESCE(toy_prefs, '{}'::text[]),
       food_prefs = COALESCE(food_prefs, '{}'::text[]);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'pets'
       AND column_name = 'id'
       AND data_type = 'uuid'
  ) THEN
    ALTER TABLE pets ALTER COLUMN id SET DEFAULT gen_random_uuid();
  ELSE
    RAISE NOTICE 'pets.id is not uuid; current runtime expects UUID pet ids.';
  END IF;
END$$;

ALTER TABLE pets
  ALTER COLUMN traits SET DEFAULT '{}'::jsonb,
  ALTER COLUMN traits SET NOT NULL,
  ALTER COLUMN allergies SET DEFAULT '{}'::text[],
  ALTER COLUMN dislikes SET DEFAULT '{}'::text[],
  ALTER COLUMN toy_prefs SET DEFAULT '{}'::text[],
  ALTER COLUMN food_prefs SET DEFAULT '{}'::text[],
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'pets_user_id_fkey'
       AND conrelid = 'pets'::regclass
  ) THEN
    ALTER TABLE pets
      ADD CONSTRAINT pets_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_pets_user_created ON pets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_customer_email ON pets(customer_email);
CREATE INDEX IF NOT EXISTS idx_pets_traits_gin ON pets USING GIN (traits);

DROP TRIGGER IF EXISTS pets_touch_updated_at ON pets;
CREATE TRIGGER pets_touch_updated_at
BEFORE UPDATE ON pets
FOR EACH ROW
EXECUTE FUNCTION pp_touch_updated_at();

CREATE OR REPLACE FUNCTION pp_sync_pet_birth_dates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.birthday IS NULL AND NEW.birthdate IS NOT NULL THEN
    NEW.birthday = NEW.birthdate;
  ELSIF NEW.birthdate IS NULL AND NEW.birthday IS NOT NULL THEN
    NEW.birthdate = NEW.birthday;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pets_sync_birth_dates ON pets;
CREATE TRIGGER pets_sync_birth_dates
BEFORE INSERT OR UPDATE ON pets
FOR EACH ROW
EXECUTE FUNCTION pp_sync_pet_birth_dates();

-- ---------------------------------------------------------------------------
-- Addresses runtime contract
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT,
  name TEXT,
  phone TEXT,
  address1 TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  is_default_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  is_default_billing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address1 TEXT,
  ADD COLUMN IF NOT EXISTS address2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS is_default_shipping BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_default_billing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE addresses
   SET is_default_shipping = COALESCE(is_default_shipping, FALSE),
       is_default_billing = COALESCE(is_default_billing, FALSE);

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
    FROM addresses
   WHERE is_default_shipping IS TRUE
)
UPDATE addresses
   SET is_default_shipping = FALSE
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
    FROM addresses
   WHERE is_default_billing IS TRUE
)
UPDATE addresses
   SET is_default_billing = FALSE
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE addresses
  ALTER COLUMN is_default_shipping SET DEFAULT FALSE,
  ALTER COLUMN is_default_shipping SET NOT NULL,
  ALTER COLUMN is_default_billing SET DEFAULT FALSE,
  ALTER COLUMN is_default_billing SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_addresses_user_created ON addresses(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default_shipping
  ON addresses(user_id)
  WHERE is_default_shipping IS TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default_billing
  ON addresses(user_id)
  WHERE is_default_billing IS TRUE;

DROP TRIGGER IF EXISTS addresses_touch_updated_at ON addresses;
CREATE TRIGGER addresses_touch_updated_at
BEFORE UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION pp_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Pet journal runtime contract
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pet_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  title TEXT,
  entry_type TEXT NOT NULL DEFAULT 'note',
  occurred_at TIMESTAMPTZ,
  mood TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  photo TEXT,
  highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  visibility TEXT NOT NULL DEFAULT 'private',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pet_journal
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS pet_id UUID,
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS entry_type TEXT DEFAULT 'note',
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mood TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS photo TEXT,
  ADD COLUMN IF NOT EXISTS highlighted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE pet_journal
   SET tags = COALESCE(tags, '{}'::text[]),
       highlighted = COALESCE(highlighted, FALSE),
       entry_type = COALESCE(NULLIF(entry_type, ''), 'note'),
       occurred_at = COALESCE(occurred_at, created_at, NOW()),
       visibility = COALESCE(NULLIF(visibility, ''), 'private'),
       metadata = COALESCE(metadata, '{}'::jsonb);

ALTER TABLE pet_journal
  ALTER COLUMN entry_type SET DEFAULT 'note',
  ALTER COLUMN entry_type SET NOT NULL,
  ALTER COLUMN tags SET DEFAULT '{}'::text[],
  ALTER COLUMN tags SET NOT NULL,
  ALTER COLUMN highlighted SET DEFAULT FALSE,
  ALTER COLUMN highlighted SET NOT NULL,
  ALTER COLUMN visibility SET DEFAULT 'private',
  ALTER COLUMN visibility SET NOT NULL,
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'pet_journal'
       AND column_name = 'id'
       AND data_type = 'uuid'
  ) THEN
    ALTER TABLE pet_journal ALTER COLUMN id SET DEFAULT gen_random_uuid();
  ELSE
    RAISE NOTICE 'pet_journal.id is not uuid; keeping existing id type.';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'pet_journal_user_id_fkey'
       AND conrelid = 'pet_journal'::regclass
  ) THEN
    ALTER TABLE pet_journal
      ADD CONSTRAINT pet_journal_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'pet_journal_pet_id_fkey'
       AND conrelid = 'pet_journal'::regclass
  ) THEN
    ALTER TABLE pet_journal
      ADD CONSTRAINT pet_journal_pet_id_fkey
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_pet_journal_user_pet_created
  ON pet_journal(user_id, pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_journal_pet_created
  ON pet_journal(pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_journal_user_pet_occurred
  ON pet_journal(user_id, pet_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_journal_entry_type
  ON pet_journal(entry_type);
CREATE INDEX IF NOT EXISTS idx_pet_journal_highlighted
  ON pet_journal(user_id, highlighted);

DROP TRIGGER IF EXISTS pet_journal_touch_updated_at ON pet_journal;
CREATE TRIGGER pet_journal_touch_updated_at
BEFORE UPDATE ON pet_journal
FOR EACH ROW
EXECUTE FUNCTION pp_touch_updated_at();
