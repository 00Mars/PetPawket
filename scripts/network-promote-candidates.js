// scripts/network-promote-candidates.js
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

const DEFAULT_DEEP_TARGETS = {
  MA: 80,
  RI: 35,
  CT: 35,
  NH: 35,
  ME: 35,
  VT: 35,
  NY: 35,
};

function stateCode(value) {
  const raw = text(value, 24)?.toUpperCase() || '';
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
}

function parseStateList(value, fallback = US_STATES) {
  const raw = text(value, 1000);
  if (!raw) return fallback;
  return raw.split(',').map(stateCode).filter(Boolean);
}

function parseTargetOverrides(value) {
  const raw = text(value, 2000);
  if (!raw) return {};
  return raw.split(',').reduce((acc, part) => {
    const [stateRaw, targetRaw] = part.split(':');
    const state = stateCode(stateRaw);
    const target = Number(targetRaw);
    if (state && Number.isFinite(target) && target >= 0) acc[state] = Math.floor(target);
    return acc;
  }, {});
}

function targetForState(state, baseline, overrides) {
  if (Object.prototype.hasOwnProperty.call(overrides, state)) return overrides[state];
  if (Object.prototype.hasOwnProperty.call(DEFAULT_DEEP_TARGETS, state)) {
    return Math.max(baseline, DEFAULT_DEEP_TARGETS[state]);
  }
  return baseline;
}

async function listingSnapshot() {
  const { rows } = await pool.query(
    `SELECT UPPER(state) AS state, id, name, city, phone, website_url
     FROM network_listings
     WHERE state IS NOT NULL`
  );
  const snapshot = new Map();
  for (const row of rows) {
    if (!snapshot.has(row.state)) {
      snapshot.set(row.state, {
        ids: new Set(),
        nameCity: new Set(),
        phoneCity: new Set(),
        hostCity: new Set(),
      });
    }
    addListingFingerprint(snapshot.get(row.state), row);
  }
  return snapshot;
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

function candidateFingerprint(candidate = {}) {
  const city = compactPart(candidate.city || candidate.location?.city);
  const name = compactPart(candidate.name);
  const phone = phoneKey(candidate.phone || candidate.contact?.phone);
  const host = hostKey(candidate.website_url || candidate.websiteUrl || candidate.contact?.website_url);
  return {
    nameCity: name && city ? `${city}|${name}` : '',
    phoneCity: phone && city ? `${city}|${phone}` : '',
    hostCity: host && city ? `${city}|${host}` : '',
  };
}

function addListingFingerprint(bucket, row = {}) {
  bucket.ids.add(row.id);
  const fp = candidateFingerprint(row);
  if (fp.nameCity) bucket.nameCity.add(fp.nameCity);
  if (fp.phoneCity) bucket.phoneCity.add(fp.phoneCity);
  if (fp.hostCity) bucket.hostCity.add(fp.hostCity);
}

function duplicateReason(bucket, candidate = {}) {
  if (!bucket) return '';
  const fp = candidateFingerprint(candidate);
  if (fp.phoneCity && bucket.phoneCity.has(fp.phoneCity)) return 'duplicate phone/city';
  if (fp.nameCity && bucket.nameCity.has(fp.nameCity)) return 'duplicate name/city';
  if (fp.hostCity && bucket.hostCity.has(fp.hostCity)) return 'duplicate website/city';
  return '';
}

async function candidatesForState(state, limit) {
  const { rows } = await pool.query(
    `SELECT id, name, source, category_primary, city, state, phone, website_url, confidence_score
     FROM network_import_candidates
     WHERE status IN ('new','needs_review','approved')
       AND UPPER(state) = $1
       AND name IS NOT NULL
       AND city IS NOT NULL
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
       CASE WHEN category_primary = 'other' THEN 1 ELSE 0 END,
       CASE WHEN address_line1 IS NULL THEN 1 ELSE 0 END,
       CASE WHEN website_url IS NULL AND phone IS NULL THEN 1 ELSE 0 END,
       confidence_score DESC,
       created_at DESC
     LIMIT $2`,
    [state, limit]
  );
  return rows;
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

async function main() {
  const dryRun = hasFlag('dry-run');
  const includeDc = hasFlag('include-dc');
  const verbose = hasFlag('verbose');
  const baseline = Math.max(0, Number(argValue('baseline', '5')) || 0);
  const batchLimit = Math.max(1, Number(argValue('candidate-limit', '200')) || 200);
  const states = parseStateList(argValue('states', ''), includeDc ? [...US_STATES, 'DC'] : US_STATES);
  const overrides = parseTargetOverrides(argValue('targets', ''));
  const listingIdsByState = await listingSnapshot();
  const summary = [];

  for (const state of states) {
    const target = targetForState(state, baseline, overrides);
    const listingBucket = listingIdsByState.get(state) || {
      ids: new Set(),
      nameCity: new Set(),
      phoneCity: new Set(),
      hostCity: new Set(),
    };
    listingIdsByState.set(state, listingBucket);
    const started = listingBucket.ids.size;
    let current = started;
    const needed = Math.max(0, target - current);
    if (!needed) {
      summary.push({ state, target, started: current, promoted: 0, skipped: 0, final: current });
      continue;
    }

    const candidates = await candidatesForState(state, Math.max(batchLimit, needed * 3));
    let promoted = 0;
    let skipped = 0;
    const skipReasons = new Map();
    for (const candidate of candidates) {
      if (promoted >= needed) break;
      const duplicate = duplicateReason(listingBucket, candidate);
      if (duplicate) {
        skipped += 1;
        skipReasons.set(duplicate, (skipReasons.get(duplicate) || 0) + 1);
        continue;
      }
      if (dryRun) {
        promoted += 1;
        current += 1;
        addListingFingerprint(listingBucket, { id: `dry-run-${candidate.id}`, ...candidate });
        continue;
      }
      try {
        const result = await promoteNetworkImportCandidate(candidate.id, null);
        if (result?.listing?.id) {
          if (listingBucket.ids.has(result.listing.id)) {
            skipped += 1;
          } else {
            addListingFingerprint(listingBucket, result.listing);
            promoted += 1;
            current = listingBucket.ids.size;
          }
        } else {
          skipped += 1;
        }
      } catch (err) {
        skipped += 1;
        const message = err?.message || String(err);
        skipReasons.set(message, (skipReasons.get(message) || 0) + 1);
        if (verbose) {
          console.warn(`[network-promote-candidates] ${state} ${candidate.id} skipped: ${message}`);
        }
      }
    }
    summary.push({
      state,
      target,
      started,
      promoted,
      skipped,
      available: candidates.length,
      final: current,
      skipReasons: Array.from(skipReasons.entries()).map(([reason, count]) => ({ reason, count })),
    });
  }

  const trust = dryRun ? null : await trustSummary();
  for (const row of summary) {
    console.log(`[network-promote-candidates] state=${row.state} target=${row.target} started=${row.started} available=${row.available ?? 0} promoted=${row.promoted} skipped=${row.skipped} final=${row.final}`);
    for (const reason of row.skipReasons || []) {
      console.log(`[network-promote-candidates] state=${row.state} skip_count=${reason.count} reason=${reason.reason}`);
    }
  }
  if (trust) {
    console.log(`[network-promote-candidates] trust total=${trust.total} non_unclaimed=${trust.non_unclaimed} partnered=${trust.partnered} charm_enabled=${trust.charm_enabled}`);
  }
  console.log(`[network-promote-candidates] complete states=${summary.length} dryRun=${dryRun}`);
}

main()
  .catch((err) => {
    console.error('[network-promote-candidates] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeNetworkDbPool(); } catch {}
  });
