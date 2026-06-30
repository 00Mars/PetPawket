// scripts/network-import-osm-overpass.js
import 'dotenv/config';
import {
  argValue,
  firstValue,
  hasFlag,
  petCategoryFromText,
  text,
} from './network-import-shared.js';
import { closeNetworkDbPool, upsertNetworkImportCandidate } from '../networkDB.pg.js';

const DEFAULT_ENDPOINT = process.env.OVERPASS_ENDPOINT || 'https://overpass-api.de/api/interpreter';

function bboxValue() {
  const bbox = text(argValue('bbox', ''), 120);
  if (!bbox) return null;
  const parts = bbox.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error('bbox must be west,south,east,north');
  }
  const [west, south, east, north] = parts;
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
    throw new Error('bbox values are outside valid ranges');
  }
  return { west, south, east, north, overpass: `${south},${west},${north},${east}` };
}

function stateCode(value) {
  const raw = text(value, 24)?.toUpperCase() || '';
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
}

function buildQuery(bbox) {
  return `
[out:json][timeout:45];
(
  nwr["amenity"="veterinary"](${bbox.overpass});
  nwr["amenity"="animal_shelter"](${bbox.overpass});
  nwr["amenity"="animal_boarding"](${bbox.overpass});
  nwr["shop"="pet_grooming"](${bbox.overpass});
  nwr["amenity"="dog_wash"](${bbox.overpass});
  nwr["amenity"="animal_training"](${bbox.overpass});
  nwr["shop"="pet"](${bbox.overpass});
  nwr["shop"="pet_supplies"](${bbox.overpass});
  nwr["name"~"(^|[^A-Za-z])(pet|pets|veterinary|veterinarian|animal hospital|animal clinic|groom|grooming|kennel|paws|dog training|dog daycare|dog boarding|cat clinic|humane society|spca|pet waste|dog waste|pooper scooper|poop scoop|litter box cleaning|aquarium cleaning|fish tank cleaning)([^A-Za-z]|$)",i](${bbox.overpass});
);
out center tags 5000;
`;
}

function tag(record, key) {
  return record?.tags?.[key];
}

function websiteFromTags(record) {
  return firstValue(
    tag(record, 'contact:website'),
    tag(record, 'website'),
    tag(record, 'url'),
    tag(record, 'contact:url')
  );
}

function phoneFromTags(record) {
  return firstValue(
    tag(record, 'contact:phone'),
    tag(record, 'phone'),
    tag(record, 'contact:mobile')
  );
}

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

function categoryFromTags(record) {
  const amenity = tag(record, 'amenity');
  const shop = tag(record, 'shop');
  if (amenity && !OSM_ALLOWED_AMENITIES.has(amenity)) return null;
  if (shop && !OSM_ALLOWED_SHOPS.has(shop)) return null;
  if (tag(record, 'amenity') === 'veterinary') return 'vet';
  if (tag(record, 'amenity') === 'animal_shelter') return 'shelter';
  if (tag(record, 'amenity') === 'animal_boarding') return 'boarding';
  if (petCategoryFromText(tag(record, 'amenity'), tag(record, 'shop'), tag(record, 'name')) === 'cleaner') return 'cleaner';
  if (tag(record, 'shop') === 'pet_grooming') return 'groomer';
  if (tag(record, 'amenity') === 'dog_wash') return 'groomer';
  if (tag(record, 'amenity') === 'animal_training') return 'trainer';
  if (tag(record, 'shop') === 'pet' || tag(record, 'shop') === 'pet_supplies') return 'other';
  return petCategoryFromText(tag(record, 'amenity'), tag(record, 'shop'), tag(record, 'name'));
}

function recordCoordinates(record) {
  if (record.lat != null && record.lon != null) return { lat: Number(record.lat), lng: Number(record.lon) };
  if (record.center?.lat != null && record.center?.lon != null) return { lat: Number(record.center.lat), lng: Number(record.center.lon) };
  return { lat: null, lng: null };
}

function osmUrl(record) {
  const type = record.type === 'way' || record.type === 'relation' ? record.type : 'node';
  return record.id ? `https://www.openstreetmap.org/${type}/${record.id}` : 'https://www.openstreetmap.org/';
}

function candidateFromOsm(record, fallbackState = null, fallbackCity = null) {
  const name = text(tag(record, 'name') || tag(record, 'operator'), 180);
  if (!name) return null;
  const category = categoryFromTags(record);
  if (!category) return null;
  const coords = recordCoordinates(record);
  const city = firstValue(
    tag(record, 'addr:city'),
    tag(record, 'addr:town'),
    tag(record, 'addr:village'),
    tag(record, 'is_in:city'),
    fallbackCity
  );
  const state = stateCode(firstValue(tag(record, 'addr:state'), fallbackState));
  const street = [tag(record, 'addr:housenumber'), tag(record, 'addr:street')].filter(Boolean).join(' ');
  const website = websiteFromTags(record);
  const phone = phoneFromTags(record);
  return {
    source: 'osm',
    source_record_id: `osm-${record.type || 'node'}-${record.id}`,
    source_url: osmUrl(record),
    source_payload: record,
    name,
    category_primary: category,
    categories: [category],
    location: {
      address_line1: text(street, 180),
      city,
      state,
      postal_code: text(tag(record, 'addr:postcode'), 20),
      lat: Number.isFinite(coords.lat) ? coords.lat : null,
      lng: Number.isFinite(coords.lng) ? coords.lng : null,
    },
    contact: {
      phone,
      website_url: website,
    },
    short_description: `${name} is a Pawket Network source candidate from OpenStreetMap tags.`,
  };
}

async function fetchOverpass(endpoint, query) {
  const body = new URLSearchParams({ data: query });
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'PetPawketNetworkImporter/1.0 (source candidate staging)',
    },
    body,
  });
  if (!resp.ok) {
    const textBody = await resp.text().catch(() => '');
    throw new Error(`Overpass request failed (${resp.status}): ${textBody.slice(0, 240)}`);
  }
  return resp.json();
}

async function main() {
  const bbox = bboxValue();
  if (!bbox) throw new Error('Usage: node scripts/network-import-osm-overpass.js --bbox=west,south,east,north [--state=MA] [--dry-run]');
  const dryRun = hasFlag('dry-run');
  const endpoint = argValue('endpoint', DEFAULT_ENDPOINT);
  const fallbackState = stateCode(argValue('state', ''));
  const fallbackCity = text(argValue('fallback-city', ''), 120);
  const query = buildQuery(bbox);
  const payload = await fetchOverpass(endpoint, query);
  const records = Array.isArray(payload.elements) ? payload.elements : [];
  let matched = 0;
  let imported = 0;
  let failed = 0;
  let contactReady = 0;
  let locationReady = 0;
  let promotableBasics = 0;

  for (const record of records) {
    const candidate = candidateFromOsm(record, fallbackState, fallbackCity);
    if (!candidate) continue;
    matched += 1;
    const hasLaunchContact = !!(candidate.contact.phone || /^https:\/\//i.test(candidate.contact.website_url || ''));
    const hasLaunchLocation = !!(candidate.location.city && candidate.location.state);
    if (hasLaunchContact) contactReady += 1;
    if (hasLaunchLocation) locationReady += 1;
    if (hasLaunchContact && hasLaunchLocation && candidate.category_primary && candidate.category_primary !== 'other') promotableBasics += 1;
    if (dryRun) continue;
    try {
      const saved = await upsertNetworkImportCandidate(candidate);
      if (saved?.id) imported += 1;
    } catch (err) {
      failed += 1;
      console.warn(`[network-import-osm-overpass] ${candidate.source_record_id} skipped: ${err?.message || err}`);
    }
  }

  console.log(`[network-import-osm-overpass] records=${records.length} matched=${matched} contactReady=${contactReady} locationReady=${locationReady} promotableBasics=${promotableBasics} imported=${imported} failed=${failed} dryRun=${dryRun}`);
}

main()
  .catch((err) => {
    console.error('[network-import-osm-overpass] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeNetworkDbPool(); } catch {}
  });
