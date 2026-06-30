// scripts/network-audit-listings.js
// Dry-run by default. Use --apply to remove clearly invalid unclaimed public listings.
import 'dotenv/config';
import {
  closeNetworkDbPool,
  pool,
} from '../networkDB.pg.js';
import { argValue, hasFlag, petCategoryFromText, text } from './network-import-shared.js';

const BLOCKED_OVERTURE_PRIMARY_CATEGORIES = new Set([
  'airport',
  'american_restaurant',
  'antique_store',
  'automotive_repair',
  'bakery',
  'bar',
  'bar_and_grill_restaurant',
  'barber',
  'building_supply_store',
  'burger_restaurant',
  'cafe',
  'car_wash',
  'clothing_store',
  'coffee_shop',
  'corporate_office',
  'fast_food_restaurant',
  'fence_and_gate_sales_service',
  'flowers_and_gifts_shop',
  'food_truck',
  'funeral_services_and_cemeteries',
  'hair_salon',
  'hot_dog_restaurant',
  'industrial_equipment',
  'machine_and_tool_rentals',
  'park',
  'pest_control_service',
  'printing_services',
  'real_estate_agent',
  'restaurant',
  'roofing',
  'tattoo_and_piercing',
  'thrift_store',
  'truck_gas_station',
]);

const OSM_ALLOWED_AMENITIES = new Set([
  'veterinary',
  'animal_shelter',
  'animal_boarding',
  'dog_wash',
  'animal_training',
]);

const OSM_ALLOWED_SHOPS = new Set([
  'pet_grooming',
  'pet_groomer',
  'pet',
  'pet_supplies',
]);

const STRONG_PET_PROVIDER_RE = /\b(vet|veterinary|veterinarian|animal hospital|animal clinic|pet hospital|pet clinic|groom|grooming|pet salon|dog salon|dog wash|pet wash|pet spa|kennel|boarding|dog daycare|doggie daycare|pet daycare|dog training|pet training|obedience|canine academy|pet sitting|pets sitting|pet sitter|pet care|dog walking|dog walker|pet resort|dog resort|animal shelter|pet shelter|humane society|spca|animal rescue|pet rescue|pet adoption|pet store|pet supplies|pet supply|pet boutique|pet services|dog treats|dog treat|cat treats|cat treat|pet treats|pet treat|petco|petsmart|pet supplies plus|pooper scooper|poop scoop|pet waste|dog waste|litter box cleaning|aquarium cleaning|fish tank cleaning|fish tank service)\b/i;
const WEAK_FALSE_PET_RE = /\b(hot dog|hotdog|pest|pest control|carpet|peterbilt)\b/i;
const FALSE_PROVIDER_NAME_RE = /\b(cat scale|cat rental|cat rentals|caterpillar|liquor|liquors|jewelry|design|designs|creative|photography|archaeology|workwear|property restoration|restoration|vending|deli|corporate office|nails|salon loft|salon lofts|hair salon|christian academy|school|remodeling|remodel|roofing|hot dog|hot dogs|corn dog|corn dogs|catering|diesel|automotive|equipment rental|sales center|dog park|dog run|dog trail|dog exercise area|excercise area|bark park|dog bar|dog bakery|bakery|restaurant|grill|cafe|ballou)\b/i;

function compact(value) {
  return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function overturePrimary(payload = {}) {
  return compact(payload?.properties?.categories?.primary || payload?.categories?.primary || payload?.categories?.main).replace(/\s+/g, '_');
}

function osmTags(payload = {}) {
  return payload?.tags || {};
}

function sourceText(row) {
  const payload = row.source_payload || {};
  return [
    row.name,
    row.category,
    row.website_url,
    row.short_description,
    row.source,
    JSON.stringify(payload?.properties?.categories || payload?.categories || payload?.tags || {}),
  ].filter(Boolean).join(' ');
}

function suggestedCategory(row) {
  return petCategoryFromText(sourceText(row));
}

function highTrustProtected(row) {
  return row.status !== 'unclaimed'
    || row.partner_tier
    || row.charm_enabled
    || row.claim_status === 'approved';
}

function auditListing(row) {
  const haystack = sourceText(row);
  const source = row.source || '';
  const suggestion = suggestedCategory(row);

  if (source === 'osm') {
    const tags = osmTags(row.source_payload);
    const amenity = tags.amenity || '';
    const shop = tags.shop || '';
    if (amenity && !OSM_ALLOWED_AMENITIES.has(amenity)) {
      return { action: 'reject', reason: `osm-disallowed-amenity:${amenity}` };
    }
    if (shop && !OSM_ALLOWED_SHOPS.has(shop)) {
      return { action: 'reject', reason: `osm-disallowed-shop:${shop}` };
    }
    if (row.category === 'other' && !OSM_ALLOWED_SHOPS.has(shop) && !STRONG_PET_PROVIDER_RE.test(haystack)) {
      return { action: 'reject', reason: 'osm-name-regex-without-pet-provider-signal' };
    }
  }

  if (source === 'overture') {
    const primary = overturePrimary(row.source_payload);
    if (primary === 'dog_park') {
      if (FALSE_PROVIDER_NAME_RE.test(haystack) && !STRONG_PET_PROVIDER_RE.test(haystack)) {
        return { action: 'reject', reason: 'overture-other-false-provider-name' };
      }
      if (/\b(dog park|off leash|off-leash)\b/i.test(row.name || '') && !STRONG_PET_PROVIDER_RE.test(haystack)) {
        return { action: 'reject', reason: 'overture-dog-park-place-not-provider' };
      }
      if (suggestion && suggestion !== 'other' && row.category === 'other') {
        return { action: 'reclassify', reason: `possible-recategory:${suggestion}`, suggestedCategory: suggestion };
      }
      return { action: 'review', reason: 'overture-dog-park-needs-provider-review' };
    }
    if (primary === 'car_wash' && /\b(dog wash|pet wash)\b/i.test(haystack)) {
      if (row.category !== 'groomer') return { action: 'reclassify', reason: 'possible-recategory:groomer', suggestedCategory: 'groomer' };
      return { action: 'keep', reason: 'pet-provider-signal-present' };
    }
    if (BLOCKED_OVERTURE_PRIMARY_CATEGORIES.has(primary)) {
      return { action: 'reject', reason: `overture-disallowed-primary:${primary}` };
    }
    if (row.category === 'other' && WEAK_FALSE_PET_RE.test(haystack) && !STRONG_PET_PROVIDER_RE.test(haystack)) {
      return { action: 'reject', reason: 'overture-false-pet-token' };
    }
    if (!primary && row.category === 'other' && FALSE_PROVIDER_NAME_RE.test(haystack) && !STRONG_PET_PROVIDER_RE.test(haystack)) {
      return { action: 'reject', reason: 'overture-other-false-provider-name' };
    }
    if (!primary && row.category === 'other' && !STRONG_PET_PROVIDER_RE.test(haystack)) {
      return { action: 'review', reason: 'overture-other-without-source-category' };
    }
  }

  if (suggestion && suggestion !== 'other' && row.category === 'other') {
    return { action: 'reclassify', reason: `possible-recategory:${suggestion}`, suggestedCategory: suggestion };
  }

  return { action: 'keep', reason: 'pet-provider-signal-present' };
}

async function loadListings(limit = 0) {
  const limitSql = limit > 0 ? `LIMIT ${Number(limit)}` : '';
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (l.id)
       l.id,
       l.slug,
       l.name,
       l.category_primary::text AS category,
       l.city,
       l.state,
       l.status,
       l.partner_tier,
       l.claim_status,
       l.charm_enabled,
       l.website_url,
       l.short_description,
       c.id AS candidate_id,
       c.source,
       c.source_record_id,
       c.source_payload,
       c.status AS candidate_status
     FROM network_listings l
     LEFT JOIN network_import_candidates c ON c.promoted_listing_id = l.id
     ORDER BY l.id, c.promoted_at DESC NULLS LAST, c.created_at DESC
     ${limitSql}`
  );
  return rows;
}

async function rejectListings(client, rows) {
  if (!rows.length) return 0;
  const payload = rows.map((row) => ({ listing_id: row.id, reason: row.reason }));
  await client.query(
    `CREATE TEMP TABLE tmp_network_audit_rejects (
       listing_id UUID PRIMARY KEY,
       reason TEXT NOT NULL
     ) ON COMMIT DROP`
  );
  await client.query(
    `INSERT INTO tmp_network_audit_rejects (listing_id, reason)
     SELECT listing_id, reason
     FROM jsonb_to_recordset($1::jsonb) AS x(listing_id UUID, reason TEXT)`,
    [JSON.stringify(payload)]
  );
  await client.query(
    `UPDATE network_import_candidates c
     SET status = 'rejected',
         review_notes = CONCAT_WS(
           E'\n',
           c.review_notes,
           'Automated source audit ' || CURRENT_DATE::text || ': removed public listing as ' || r.reason || '.'
         ),
         promoted_listing_id = NULL,
         match_listing_id = NULL,
         reviewed_at = NOW(),
         updated_at = NOW()
     FROM tmp_network_audit_rejects r
     WHERE c.promoted_listing_id = r.listing_id OR c.match_listing_id = r.listing_id`
  );
  const deleted = await client.query(
    `DELETE FROM network_listings l
     USING tmp_network_audit_rejects r
     WHERE l.id = r.listing_id`
  );
  return deleted.rowCount || 0;
}

async function reclassifyListings(client, rows) {
  const safeRows = rows.filter((row) => row.suggestedCategory && row.category !== row.suggestedCategory);
  if (!safeRows.length) return 0;
  const payload = safeRows.map((row) => ({
    listing_id: row.id,
    category: row.suggestedCategory,
    reason: row.reason,
  }));
  await client.query(
    `CREATE TEMP TABLE tmp_network_audit_reclassify (
       listing_id UUID PRIMARY KEY,
       category TEXT NOT NULL,
       reason TEXT NOT NULL
     ) ON COMMIT DROP`
  );
  await client.query(
    `INSERT INTO tmp_network_audit_reclassify (listing_id, category, reason)
     SELECT listing_id, category, reason
     FROM jsonb_to_recordset($1::jsonb) AS x(listing_id UUID, category TEXT, reason TEXT)`,
    [JSON.stringify(payload)]
  );
  const updated = await client.query(
    `UPDATE network_listings l
     SET category_primary = r.category::network_primary_category,
         categories = ARRAY[r.category]::text[],
         updated_at = NOW()
     FROM tmp_network_audit_reclassify r
     WHERE l.id = r.listing_id
       AND l.status = 'unclaimed'
       AND l.partner_tier IS NULL
       AND l.charm_enabled = FALSE
       AND l.claim_status <> 'approved'`
  );
  await client.query(
    `UPDATE network_import_candidates c
     SET category_primary = r.category::network_primary_category,
         categories = ARRAY[r.category]::text[],
         review_notes = CONCAT_WS(
           E'\n',
           c.review_notes,
           'Automated source audit ' || CURRENT_DATE::text || ': reclassified public listing as ' || r.category || ' from ' || r.reason || '.'
         ),
         reviewed_at = NOW(),
         updated_at = NOW()
     FROM tmp_network_audit_reclassify r
     WHERE c.promoted_listing_id = r.listing_id OR c.match_listing_id = r.listing_id`
  );
  return updated.rowCount || 0;
}

async function holdReviewListings(client, rows) {
  if (!rows.length) return 0;
  const payload = rows.map((row) => ({ listing_id: row.id, reason: row.reason }));
  await client.query(
    `CREATE TEMP TABLE tmp_network_audit_review_holds (
       listing_id UUID PRIMARY KEY,
       reason TEXT NOT NULL
     ) ON COMMIT DROP`
  );
  await client.query(
    `INSERT INTO tmp_network_audit_review_holds (listing_id, reason)
     SELECT listing_id, reason
     FROM jsonb_to_recordset($1::jsonb) AS x(listing_id UUID, reason TEXT)`,
    [JSON.stringify(payload)]
  );
  await client.query(
    `UPDATE network_import_candidates c
     SET status = 'needs_review',
         review_notes = CONCAT_WS(
           E'\n',
           c.review_notes,
           'Automated source audit ' || CURRENT_DATE::text || ': held public listing for ops review as ' || r.reason || '.'
         ),
         promoted_listing_id = NULL,
         match_listing_id = NULL,
         reviewed_at = NOW(),
         updated_at = NOW()
     FROM tmp_network_audit_review_holds r
     WHERE c.promoted_listing_id = r.listing_id OR c.match_listing_id = r.listing_id`
  );
  const deleted = await client.query(
    `DELETE FROM network_listings l
     USING tmp_network_audit_review_holds r
     WHERE l.id = r.listing_id`
  );
  return deleted.rowCount || 0;
}

function summarize(audits) {
  const byAction = new Map();
  const byReason = new Map();
  const samples = [];
  for (const item of audits) {
    byAction.set(item.action, (byAction.get(item.action) || 0) + 1);
    if (item.action !== 'keep') {
      byReason.set(item.reason, (byReason.get(item.reason) || 0) + 1);
      if (samples.length < 40) samples.push(item);
    }
  }
  return {
    byAction: Object.fromEntries([...byAction].sort()),
    byReason: Object.fromEntries([...byReason].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    samples,
  };
}

async function main() {
  const apply = hasFlag('apply');
  const holdReview = hasFlag('hold-review');
  const json = hasFlag('json');
  const limit = Number(argValue('limit', '0')) || 0;
  const listings = await loadListings(limit);
  const audits = listings.map((row) => ({ ...row, ...auditListing(row) }));
  const rejectable = audits.filter((item) => item.action === 'reject' && !highTrustProtected(item));
  const reclassifiable = audits.filter((item) => item.action === 'reclassify' && !highTrustProtected(item));
  const reviewable = audits.filter((item) => item.action === 'review' && !highTrustProtected(item));
  let removed = 0;
  let reclassified = 0;
  let heldForReview = 0;

  if (apply && (rejectable.length || reclassifiable.length || (holdReview && reviewable.length))) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      removed = await rejectListings(client, rejectable);
      reclassified = await reclassifyListings(client, reclassifiable);
      if (holdReview) heldForReview = await holdReviewListings(client, reviewable);
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      throw err;
    } finally {
      client.release();
    }
  }

  const summary = summarize(audits);
  const report = {
    scanned: listings.length,
    dryRun: !apply,
    removed,
    reclassified,
    heldForReview,
    rejectable: rejectable.length,
    reclassifiable: reclassifiable.length,
    reviewable: reviewable.length,
    ...summary,
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`[network-audit-listings] scanned=${report.scanned} dryRun=${report.dryRun} rejectable=${report.rejectable} reclassifiable=${report.reclassifiable} reviewable=${report.reviewable} removed=${report.removed} reclassified=${report.reclassified} held_for_review=${report.heldForReview}`);
  console.log('action\tcount');
  Object.entries(report.byAction).forEach(([action, count]) => console.log(`${action}\t${count}`));
  console.log('reason\tcount');
  Object.entries(report.byReason).forEach(([reason, count]) => console.log(`${reason}\t${count}`));
  console.log('sample_action\treason\tcategory\tstate\tname');
  report.samples.forEach((item) => console.log(`${item.action}\t${item.reason}\t${item.category}\t${item.state || ''}\t${item.name}`));
}

main()
  .catch((err) => {
    console.error('[network-audit-listings] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeNetworkDbPool(); } catch {}
  });
