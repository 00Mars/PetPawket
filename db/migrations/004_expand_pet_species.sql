-- db/migrations/004_expand_pet_species.sql
-- Expand pets.species constraint to align with UI species list (idempotent).

DO $$
BEGIN
  IF to_regclass('public.pets') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_species_check') THEN
      ALTER TABLE pets DROP CONSTRAINT pets_species_check;
    END IF;

    ALTER TABLE pets
      ADD CONSTRAINT pets_species_check
      CHECK (
        species IS NULL OR species IN (
          'dog','cat','bird','fish','reptile',
          'rabbit','hamster','guinea pig','ferret','horse',
          'small','small-pet','small pet','other'
        )
      ) NOT VALID;
  END IF;
END$$;
