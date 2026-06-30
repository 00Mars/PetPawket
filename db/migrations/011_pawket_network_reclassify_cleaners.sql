-- Move existing pet cleaner / waste cleanup rows out of generic Other.

UPDATE network_listings
SET category_primary = 'cleaner',
    categories = ARRAY['cleaner']::text[],
    updated_at = NOW()
WHERE category_primary::text = 'other'
  AND (
    name ~* '(pet|dog|cat|animal|paw|paws|fish|aquarium).*(clean|cleaning|cleanup|clean up|waste|scoop|scooper|poop|doody|litter)'
    OR name ~* '(clean|cleaning|cleanup|clean up|waste|scoop|scooper|poop|doody|litter).*(pet|dog|cat|animal|paw|paws|fish|aquarium)'
    OR name ~* '(pooper|scooper|scooping|poop|doody|pet waste|dog waste|cat waste|litter box|aquarium cleaning|aquarium maintenance|fish tank cleaning|fish tank service|fish tank maintenance)'
  );

UPDATE network_import_candidates
SET category_primary = 'cleaner',
    categories = ARRAY['cleaner']::text[],
    updated_at = NOW()
WHERE category_primary::text = 'other'
  AND (
    name ~* '(pet|dog|cat|animal|paw|paws|fish|aquarium).*(clean|cleaning|cleanup|clean up|waste|scoop|scooper|poop|doody|litter)'
    OR name ~* '(clean|cleaning|cleanup|clean up|waste|scoop|scooper|poop|doody|litter).*(pet|dog|cat|animal|paw|paws|fish|aquarium)'
    OR name ~* '(pooper|scooper|scooping|poop|doody|pet waste|dog waste|cat waste|litter box|aquarium cleaning|aquarium maintenance|fish tank cleaning|fish tank service|fish tank maintenance)'
  );

UPDATE network_nominations
SET category_primary = 'cleaner',
    updated_at = NOW()
WHERE category_primary::text = 'other'
  AND (
    provider_name ~* '(pet|dog|cat|animal|paw|paws|fish|aquarium).*(clean|cleaning|cleanup|clean up|waste|scoop|scooper|poop|doody|litter)'
    OR provider_name ~* '(clean|cleaning|cleanup|clean up|waste|scoop|scooper|poop|doody|litter).*(pet|dog|cat|animal|paw|paws|fish|aquarium)'
    OR provider_name ~* '(pooper|scooper|scooping|poop|doody|pet waste|dog waste|cat waste|litter box|aquarium cleaning|aquarium maintenance|fish tank cleaning|fish tank service|fish tank maintenance)'
  );
