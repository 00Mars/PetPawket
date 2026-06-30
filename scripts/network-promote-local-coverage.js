// scripts/network-promote-local-coverage.js
import 'dotenv/config';
import {
  closeNetworkDbPool,
  pool,
  promoteNetworkImportCandidate,
} from '../networkDB.pg.js';
import { argValue, hasFlag, text } from './network-import-shared.js';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
  'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND',
  'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const CATEGORY_RANK = {
  vet: 0,
  shelter: 1,
  rescue: 2,
  groomer: 3,
  boarding: 4,
  trainer: 5,
  daycare: 6,
  sitter: 7,
  walker: 8,
  other: 9,
};

const SOURCE_RANK = {
  osm: 0,
  overture: 1,
  paid_provider: 2,
  partner_api: 3,
  irs_eo_bmf: 4,
};

function stateCode(value) {
  const raw = text(value, 24)?.toUpperCase() || '';
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
}

function parseStateList(value, fallback = ['MA']) {
  const raw = text(value, 1000);
  if (!raw) return fallback;
  const states = raw.split(',').map(stateCode).filter(Boolean);
  return states.length ? states : fallback;
}

function numberArg(name, fallback, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const value = Number(argValue(name, fallback));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function compactPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|inc|llc|ltd|co|company)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function phoneKey(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

function hostKey(value) {
  const raw = text(value, 400);
  if (!raw) return '';
  try {
    return new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function fingerprint(row = {}) {
  const city = compactPart(row.city || row.location?.city);
  const name = compactPart(row.name);
  const phone = phoneKey(row.phone || row.contact?.phone);
  const host = hostKey(row.website_url || row.websiteUrl || row.contact?.website_url);
  return {
    nameCity: name && city ? `${city}|${name}` : '',
    phoneCity: phone && city ? `${city}|${phone}` : '',
    hostCity: host && city ? `${city}|${host}` : '',
  };
}

function addFingerprint(bucket, row = {}) {
  if (!bucket) return;
  const fp = fingerprint(row);
  if (fp.nameCity) bucket.nameCity.add(fp.nameCity);
  if (fp.phoneCity) bucket.phoneCity.add(fp.phoneCity);
  if (fp.hostCity) bucket.hostCity.add(fp.hostCity);
}

function duplicateReason(buckets, candidate = {}) {
  const state = stateCode(candidate.state || candidate.location?.state);
  const bucket = state ? buckets.get(state) : null;
  if (!bucket) return '';
  const fp = fingerprint(candidate);
  if (fp.phoneCity && bucket.phoneCity.has(fp.phoneCity)) return 'duplicate phone/city';
  if (fp.nameCity && bucket.nameCity.has(fp.nameCity)) return 'duplicate name/city';
  if (fp.hostCity && bucket.hostCity.has(fp.hostCity)) return 'duplicate website/city';
  return '';
}

function bucketForState(buckets, state) {
  if (!buckets.has(state)) {
    buckets.set(state, {
      nameCity: new Set(),
      phoneCity: new Set(),
      hostCity: new Set(),
    });
  }
  return buckets.get(state);
}

function radians(value) {
  return (Number(value) * Math.PI) / 180;
}

function distanceMi(a, b) {
  const lat1 = Number(a?.latitude ?? a?.lat);
  const lng1 = Number(a?.longitude ?? a?.lng);
  const lat2 = Number(b?.latitude ?? b?.lat);
  const lng2 = Number(b?.longitude ?? b?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const sLat1 = radians(lat1);
  const sLat2 = radians(lat2);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(sLat1) * Math.cos(sLat2) * Math.sin(dLng / 2) ** 2;
  return 3959 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function samePlaceCity(row, place) {
  return stateCode(row.state) === place.state && compactPart(row.city) === compactPart(place.name);
}

function countExact(listings, place) {
  return listings.filter((listing) => samePlaceCity(listing, place)).length;
}

function countRadius(listings, place, radiusMi) {
  return listings.filter((listing) => distanceMi(place, listing) <= radiusMi).length;
}

async function loadPlaces(states, limit) {
  const params = [states];
  let limitSql = '';
  if (limit > 0) {
    params.push(limit);
    limitSql = `LIMIT $${params.length}`;
  }
  const { rows } = await pool.query(
    `WITH ranked AS (
       SELECT DISTINCT ON (LOWER(p.name), p.state)
         p.name,
         p.canonical_name AS "canonicalName",
         p.state,
         p.place_kind AS "placeKind",
         p.latitude,
         p.longitude,
         p.source,
         CASE p.source WHEN 'census_place' THEN 0 WHEN 'census_cousub' THEN 1 ELSE 2 END AS source_rank,
         CASE p.place_kind
           WHEN 'city' THEN 0
           WHEN 'town' THEN 0
           WHEN 'village' THEN 1
           WHEN 'borough' THEN 1
           WHEN 'municipality' THEN 1
           WHEN 'cdp' THEN 2
           WHEN 'township' THEN 3
           ELSE 4
         END AS kind_rank
       FROM network_place_index p
       WHERE p.state = ANY($1::text[])
         AND p.source <> 'census_zcta'
       ORDER BY LOWER(p.name), p.state, source_rank, kind_rank, p.name
     )
     SELECT name, "canonicalName", state, "placeKind", latitude, longitude, source
     FROM ranked
     ORDER BY
       CASE state WHEN 'MA' THEN 0 WHEN 'NH' THEN 1 WHEN 'RI' THEN 2 WHEN 'CT' THEN 3 WHEN 'ME' THEN 4 WHEN 'VT' THEN 5 WHEN 'NY' THEN 6 ELSE 7 END,
       name ASC
     ${limitSql}`,
    params
  );
  return rows.map((row) => ({
    name: row.name,
    canonicalName: row.canonicalName,
    state: stateCode(row.state),
    placeKind: row.placeKind,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    source: row.source,
  })).filter((row) => row.state && Number.isFinite(row.latitude) && Number.isFinite(row.longitude));
}

async function loadListings() {
  const { rows } = await pool.query(
    `SELECT id, name, city, UPPER(state) AS state, phone, website_url, latitude, longitude
     FROM network_listings
     WHERE state IS NOT NULL`
  );
  const buckets = new Map();
  for (const row of rows) {
    const state = stateCode(row.state);
    if (!state) continue;
    addFingerprint(bucketForState(buckets, state), row);
  }
  return {
    listings: rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      state: stateCode(row.state),
      phone: row.phone,
      website_url: row.website_url,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
    })),
    buckets,
  };
}

async function loadCandidates(states, limit) {
  const { rows } = await pool.query(
    `SELECT id, name, source, category_primary, city, UPPER(state) AS state, phone, website_url,
       confidence_score, address_line1, postal_code, latitude, longitude
     FROM network_import_candidates
     WHERE status IN ('new','needs_review','approved')
       AND UPPER(state) = ANY($1::text[])
       AND name IS NOT NULL
       AND city IS NOT NULL
       AND category_primary <> 'other'
       AND latitude IS NOT NULL
       AND longitude IS NOT NULL
       AND (phone IS NOT NULL OR LOWER(website_url) LIKE 'https://%')
     ORDER BY
       CASE source
         WHEN 'osm' THEN 0
         WHEN 'overture' THEN 1
         WHEN 'paid_provider' THEN 2
         WHEN 'partner_api' THEN 3
         WHEN 'irs_eo_bmf' THEN 4
         ELSE 5
       END,
       CASE category_primary
         WHEN 'vet' THEN 0
         WHEN 'shelter' THEN 1
         WHEN 'rescue' THEN 2
         WHEN 'groomer' THEN 3
         WHEN 'boarding' THEN 4
         WHEN 'trainer' THEN 5
         WHEN 'daycare' THEN 6
         WHEN 'sitter' THEN 7
         WHEN 'walker' THEN 8
         ELSE 9
       END,
       confidence_score DESC,
       created_at DESC
     LIMIT $2`,
    [states, limit]
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    source: row.source,
    category_primary: row.category_primary,
    city: row.city,
    state: stateCode(row.state),
    phone: row.phone,
    website_url: row.website_url,
    confidence_score: Number(row.confidence_score || 0),
    address_line1: row.address_line1,
    postal_code: row.postal_code,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
  })).filter((row) => row.state && Number.isFinite(row.latitude) && Number.isFinite(row.longitude));
}

function candidateRank(candidate, place, { exactNeeded }) {
  const exact = samePlaceCity(candidate, place);
  return [
    exactNeeded && exact ? 0 : exactNeeded ? 1 : exact ? 0 : 1,
    CATEGORY_RANK[candidate.category_primary] ?? 9,
    SOURCE_RANK[candidate.source] ?? 9,
    distanceMi(place, candidate),
    -Number(candidate.confidence_score || 0),
    String(candidate.name || ''),
  ];
}

function compareRank(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i];
    const right = b[i];
    if (typeof left === 'number' && typeof right === 'number') {
      if (left !== right) return left - right;
    } else {
      const cmp = String(left || '').localeCompare(String(right || ''));
      if (cmp) return cmp;
    }
  }
  return 0;
}

function fakeListingFromCandidate(candidate) {
  return {
    id: `dry-run-${candidate.id}`,
    name: candidate.name,
    city: candidate.city,
    state: candidate.state,
    phone: candidate.phone,
    website_url: candidate.website_url,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
  };
}

async function trustSummary() {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status <> 'unclaimed')::int AS non_unclaimed,
       COUNT(*) FILTER (WHERE partner_tier IS NOT NULL)::int AS partnered,
       COUNT(*) FILTER (WHERE charm_enabled)::int AS charm_enabled
     FROM network_listings`
  );
  return rows[0] || {};
}

async function duplicateSummary() {
  const { rows } = await pool.query(
    `WITH duplicate_names AS (
       SELECT UPPER(state), LOWER(city), LOWER(name)
       FROM network_listings
       WHERE state IS NOT NULL AND city IS NOT NULL AND name IS NOT NULL
       GROUP BY 1, 2, 3
       HAVING COUNT(*) > 1
     ),
     duplicate_phones AS (
       SELECT UPPER(state), LOWER(city), RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10)
       FROM network_listings
       WHERE state IS NOT NULL
         AND city IS NOT NULL
         AND phone IS NOT NULL
         AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) <> ''
       GROUP BY 1, 2, 3
       HAVING COUNT(*) > 1
     )
     SELECT
       (SELECT COUNT(*)::int FROM duplicate_names) AS duplicate_name_groups,
       (SELECT COUNT(*)::int FROM duplicate_phones) AS duplicate_phone_groups`
  );
  return rows[0] || {};
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const verbose = hasFlag('verbose');
  const json = hasFlag('json');
  const summaryOnly = hasFlag('summary-only');
  const states = parseStateList(argValue('states', argValue('state', 'MA')), ['MA']).filter((state) => US_STATES.includes(state) || state === 'DC');
  const radiusMi = numberArg('radius-mi', 25, { min: 1, max: 250 });
  const minExact = Math.floor(numberArg('min-exact', 2, { min: 0, max: 50 }));
  const minRadius = Math.floor(numberArg('min-radius', 12, { min: 0, max: 200 }));
  const perPlace = Math.floor(numberArg('per-place', 4, { min: 1, max: 50 }));
  const maxPromotions = Math.floor(numberArg('max-promotions', 250, { min: 1, max: 5000 }));
  const placeLimit = Math.floor(numberArg('place-limit', 0, { min: 0, max: 100000 }));
  const candidateLimit = Math.floor(numberArg('candidate-limit', 25000, { min: 1, max: 250000 }));

  if (!states.length) throw new Error('No valid states supplied');

  const [places, listingState, candidates] = await Promise.all([
    loadPlaces(states, placeLimit),
    loadListings(),
    loadCandidates(states, candidateLimit),
  ]);
  const { listings, buckets } = listingState;
  const usedCandidateIds = new Set();
  const skipReasons = new Map();
  const placeRows = places.map((place) => {
    const exactPublic = countExact(listings, place);
    const radiusPublic = countRadius(listings, place, radiusMi);
    const nearbyCandidates = candidates.filter((candidate) => distanceMi(place, candidate) <= radiusMi);
    const exactCandidates = nearbyCandidates.filter((candidate) => samePlaceCity(candidate, place));
    const exactGap = Math.max(0, minExact - exactPublic);
    const radiusGap = Math.max(0, minRadius - radiusPublic);
    return {
      place,
      exactPublic,
      radiusPublic,
      exactCandidates: exactCandidates.length,
      nearbyCandidates: nearbyCandidates.length,
      exactGap,
      radiusGap,
      severity: (exactGap * 1000) + (radiusGap * 20) + Math.min(100, exactCandidates.length * 4 + nearbyCandidates.length),
    };
  })
    .filter((row) => (row.exactGap > 0 || row.radiusGap > 0) && row.nearbyCandidates > 0)
    .sort((a, b) => b.severity - a.severity
      || a.exactPublic - b.exactPublic
      || a.radiusPublic - b.radiusPublic
      || b.exactCandidates - a.exactCandidates
      || a.place.name.localeCompare(b.place.name));

  const touchedPlaces = [];
  let promoted = 0;
  let skipped = 0;

  for (const row of placeRows) {
    if (promoted >= maxPromotions) break;
    const { place } = row;
    let exactCount = countExact(listings, place);
    let radiusCount = countRadius(listings, place, radiusMi);
    if (exactCount >= minExact && radiusCount >= minRadius) continue;

    const startedExact = exactCount;
    const startedRadius = radiusCount;
    const promotedHere = [];
    let attemptsHere = 0;

    while ((exactCount < minExact || radiusCount < minRadius) && promotedHere.length < perPlace && promoted < maxPromotions) {
      const exactNeeded = exactCount < minExact;
      const nearbyPool = candidates
        .filter((candidate) => !usedCandidateIds.has(candidate.id))
        .filter((candidate) => distanceMi(place, candidate) <= radiusMi)
        .sort((a, b) => compareRank(
          candidateRank(a, place, { exactNeeded }),
          candidateRank(b, place, { exactNeeded })
        ));

      let candidate = null;
      if (exactNeeded) {
        candidate = nearbyPool
          .filter((item) => samePlaceCity(item, place))
          .find((item) => !duplicateReason(buckets, item));
      }
      if (!candidate && radiusCount < minRadius) {
        candidate = nearbyPool.find((item) => !duplicateReason(buckets, item));
      }
      if (!candidate) break;
      attemptsHere += 1;
      usedCandidateIds.add(candidate.id);

      if (dryRun) {
        const listing = fakeListingFromCandidate(candidate);
        listings.push(listing);
        addFingerprint(bucketForState(buckets, listing.state), listing);
        promoted += 1;
        promotedHere.push(candidate);
      } else {
        try {
          const result = await promoteNetworkImportCandidate(candidate.id, null);
          const listing = result?.listing;
          if (!listing?.id) {
            skipped += 1;
            skipReasons.set('promotion returned no listing', (skipReasons.get('promotion returned no listing') || 0) + 1);
            continue;
          }
          const publicListing = {
            id: listing.id,
            name: listing.name,
            city: listing.location?.city || listing.city,
            state: stateCode(listing.location?.state || listing.state),
            phone: listing.contact?.phone || listing.phone,
            website_url: listing.contact?.website_url || listing.website_url,
            latitude: Number(listing.location?.lat ?? listing.lat),
            longitude: Number(listing.location?.lng ?? listing.lng),
          };
          listings.push(publicListing);
          addFingerprint(bucketForState(buckets, publicListing.state), publicListing);
          promoted += 1;
          promotedHere.push(candidate);
        } catch (err) {
          skipped += 1;
          const reason = err?.message || String(err);
          skipReasons.set(reason, (skipReasons.get(reason) || 0) + 1);
          if (verbose) {
            console.warn(`[network-promote-local-coverage] ${candidate.id} skipped: ${reason}`);
          }
        }
      }

      exactCount = countExact(listings, place);
      radiusCount = countRadius(listings, place, radiusMi);
    }

    if (promotedHere.length || attemptsHere) {
      touchedPlaces.push({
        place: `${place.name}, ${place.state}`,
        startedExact,
        finalExact: exactCount,
        startedRadius,
        finalRadius: radiusCount,
        promoted: promotedHere.length,
        listings: promotedHere.map((candidate) => `${candidate.name} (${candidate.city}, ${candidate.state})`),
      });
    }
  }

  const trust = dryRun ? null : await trustSummary();
  const duplicates = dryRun ? null : await duplicateSummary();
  const summary = {
    dryRun,
    states,
    radiusMi,
    minExact,
    minRadius,
    perPlace,
    maxPromotions,
    placesLoaded: places.length,
    candidateRows: candidates.length,
    placesWithGaps: placeRows.length,
    placesTouched: touchedPlaces.length,
    promoted,
    skipped,
    skipReasons: Array.from(skipReasons.entries()).map(([reason, count]) => ({ reason, count })),
    trust: trust ? {
      total: Number(trust.total || 0),
      non_unclaimed: Number(trust.non_unclaimed || 0),
      partnered: Number(trust.partnered || 0),
      charm_enabled: Number(trust.charm_enabled || 0),
    } : null,
    duplicates: duplicates ? {
      name_groups: Number(duplicates.duplicate_name_groups || 0),
      phone_groups: Number(duplicates.duplicate_phone_groups || 0),
    } : null,
  };

  if (json) {
    console.log(JSON.stringify({ summary, touchedPlaces }, null, 2));
  } else {
    console.log(`[network-promote-local-coverage] states=${states.join(',')} radius=${radiusMi} min_exact=${minExact} min_radius=${minRadius} places_loaded=${places.length} places_with_gaps=${placeRows.length} candidates=${candidates.length} promoted=${promoted} skipped=${skipped} dryRun=${dryRun}`);
    if (!summaryOnly) {
      touchedPlaces.slice(0, 80).forEach((row) => {
        console.log(`[network-promote-local-coverage] place=${row.place} exact=${row.startedExact}->${row.finalExact} radius=${row.startedRadius}->${row.finalRadius} promoted=${row.promoted}`);
        if (verbose) {
          row.listings.forEach((listing) => console.log(`  - ${listing}`));
        }
      });
      if (touchedPlaces.length > 80) {
        console.log(`[network-promote-local-coverage] additional_places=${touchedPlaces.length - 80}`);
      }
    }
    for (const reason of summary.skipReasons) {
      console.log(`[network-promote-local-coverage] skip_count=${reason.count} reason=${reason.reason}`);
    }
    if (summary.trust) {
      console.log(`[network-promote-local-coverage] trust total=${summary.trust.total} non_unclaimed=${summary.trust.non_unclaimed} partnered=${summary.trust.partnered} charm_enabled=${summary.trust.charm_enabled}`);
    }
    if (summary.duplicates) {
      console.log(`[network-promote-local-coverage] duplicates name_groups=${summary.duplicates.name_groups} phone_groups=${summary.duplicates.phone_groups}`);
    }
  }
}

main()
  .catch((err) => {
    console.error('[network-promote-local-coverage] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeNetworkDbPool(); } catch {}
  });
