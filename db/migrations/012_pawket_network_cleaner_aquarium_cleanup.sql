-- Keep generic aquarium shops out of Cleaner unless cleanup or maintenance is explicit.

UPDATE network_listings
SET category_primary = 'other',
    categories = ARRAY['other']::text[],
    updated_at = NOW()
WHERE category_primary::text = 'cleaner'
  AND name ~* '(aquarium|fish tank)'
  AND name !~* '(clean|cleaning|cleanup|clean up|maintenance|service|services|waste|scoop|scooper|poop|doody|litter)';

UPDATE network_import_candidates
SET category_primary = 'other',
    categories = ARRAY['other']::text[],
    updated_at = NOW()
WHERE category_primary::text = 'cleaner'
  AND name ~* '(aquarium|fish tank)'
  AND name !~* '(clean|cleaning|cleanup|clean up|maintenance|service|services|waste|scoop|scooper|poop|doody|litter)';

UPDATE network_nominations
SET category_primary = 'other',
    updated_at = NOW()
WHERE category_primary::text = 'cleaner'
  AND provider_name ~* '(aquarium|fish tank)'
  AND provider_name !~* '(clean|cleaning|cleanup|clean up|maintenance|service|services|waste|scoop|scooper|poop|doody|litter)';
