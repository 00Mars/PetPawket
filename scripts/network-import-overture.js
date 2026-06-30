// scripts/network-import-overture.js
import 'dotenv/config';
import {
  argValue,
  firstValue,
  hasFlag,
  inputPath,
  petCategoryFromText,
  readJsonRecords,
  text,
} from './network-import-shared.js';
import { closeNetworkDbPool, upsertNetworkImportCandidate } from '../networkDB.pg.js';

function stateCode(value) {
  const raw = text(value, 24)?.toUpperCase().replace(/^US[-_]/, '') || '';
  const hit = raw.match(/[A-Z]{2}/);
  return hit ? hit[0] : null;
}

function primaryName(names) {
  if (!names) return null;
  if (typeof names === 'string') return text(names, 180);
  if (names.primary) return text(names.primary, 180);
  if (Array.isArray(names.common)) {
    const hit = names.common.find((item) => item?.value || typeof item === 'string');
    return text(hit?.value || hit, 180);
  }
  if (names.common && typeof names.common === 'object') {
    return text(Object.values(names.common)[0], 180);
  }
  return null;
}

function stringList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;
      return item?.value || item?.url || item?.phone || item?.name || '';
    }).filter(Boolean);
  }
  if (typeof value === 'object') return Object.values(value).flat().map((item) => String(item || '')).filter(Boolean);
  return [String(value)];
}

function categoryText(value) {
  return String(value || '').replace(/_/g, ' ').toLowerCase().trim();
}

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

function categoryFromOvertureValue(value) {
  const s = categoryText(value);
  if (!s) return null;
  if (BLOCKED_OVERTURE_PRIMARY_CATEGORIES.has(s.replace(/\s+/g, '_'))) return null;
  if (/\b(veterinarian|veterinary|animal hospital|pet hospital)\b/.test(s)) return 'vet';
  if (/\b(animal shelter|pet shelter|humane society|spca)\b/.test(s)) return 'shelter';
  if (/\b(animal rescue|pet rescue|dog rescue|cat rescue|pet adoption)\b/.test(s)) return 'rescue';
  if (/\b(pet boarding|dog boarding|cat boarding|horse boarding|kennel|pet hotel|dog hotel)\b/.test(s)) return 'boarding';
  if (/\b(pet waste|dog waste|cat waste|pooper scooper|poop scoop|poop pickup|poop pick up|poop clean up|poop cleanup|doody|litter box cleaning|cat litter cleaning|aquarium cleaning|fish tank cleaning|pet cleaning|pet cleanup)\b/.test(s)) return 'cleaner';
  if (/\b(pet groomer|pet grooming|dog grooming|dog wash|pet spa)\b/.test(s)) return 'groomer';
  if (/\b(dog daycare|dog day care|doggy daycare|doggie daycare|pet daycare|pet day care)\b/.test(s)) return 'daycare';
  if (/\b(pet sitting|pet sitter|dog sitting|dog sitter|cat sitting|cat sitter)\b/.test(s)) return 'sitter';
  if (/\b(dog walkers|dog walker|dog walking|pet walker|pet walking)\b/.test(s)) return 'walker';
  if (/\b(dog trainer|dog training|pet trainer|pet training|animal trainer|animal training|obedience)\b/.test(s)) return 'trainer';
  if (/\b(pet store|pet services|pets)\b/.test(s)) return 'other';
  return null;
}

function overtureCategory(props, name) {
  const primary = props.categories?.primary || props.categories?.main;
  if (String(primary || '').toLowerCase() === 'dog_park'
    && /\b(dog park|off leash|off-leash)\b/i.test(String(name || ''))
    && !/\b(resort|boarding|daycare|day care|kennel|training|groom|wash)\b/i.test(String(name || ''))) return null;
  if (String(primary || '').toLowerCase() === 'car_wash'
    && /\b(dog wash|pet wash)\b/i.test(String(name || ''))) {
    return 'groomer';
  }
  if (BLOCKED_OVERTURE_PRIMARY_CATEGORIES.has(String(primary || '').toLowerCase())) return null;
  const primaryCategory = categoryFromOvertureValue(primary);
  if (primaryCategory && primaryCategory !== 'other') return primaryCategory;

  const nameCategory = petCategoryFromText(name);
  if (nameCategory && nameCategory !== 'other') return nameCategory;

  const alternateCategories = stringList(props.categories?.alternate);
  const allowAlternates = primaryCategory === 'other' || !!nameCategory;
  if (allowAlternates) {
    const alternateCategory = alternateCategories
      .map(categoryFromOvertureValue)
      .find((category) => category && category !== 'other');
    if (alternateCategory) return alternateCategory;
  }

  return primaryCategory || nameCategory || null;
}

function extractAddress(props) {
  const address = Array.isArray(props.addresses) ? props.addresses[0] : (props.address || {});
  return {
    address_line1: firstValue(address?.freeform, address?.street_address, address?.street, props.address_line1),
    city: firstValue(address?.locality, address?.city, props.locality, props.city),
    state: stateCode(firstValue(address?.region, address?.region_code, props.region, props.state)),
    postal_code: firstValue(address?.postcode, address?.postal_code, props.postcode, props.postal_code),
  };
}

function extractCoordinates(record, props) {
  const coords = record?.geometry?.coordinates || props?.geometry?.coordinates || props?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    return { lng: Number(coords[0]), lat: Number(coords[1]) };
  }
  return {
    lat: Number(props.latitude ?? props.lat),
    lng: Number(props.longitude ?? props.lng),
  };
}

function candidateFromOverture(record, sourceUrl) {
  const props = record?.properties || record || {};
  const name = primaryName(props.names) || text(props.name, 180);
  const category = overtureCategory(props, name);
  if (!category) return null;

  const address = extractAddress(props);
  const coords = extractCoordinates(record, props);
  const website = firstValue(props.websites, props.website, props.url);
  const phone = firstValue(props.phones, props.phone);

  return {
    source: 'overture',
    source_record_id: text(props.id || record.id, 240),
    source_url: sourceUrl,
    source_payload: record,
    name,
    category_primary: category,
    categories: [category],
    location: {
      ...address,
      lat: Number.isFinite(coords.lat) ? coords.lat : null,
      lng: Number.isFinite(coords.lng) ? coords.lng : null,
    },
    contact: {
      website_url: website,
      phone,
    },
    short_description: `${name} is a Pawket Network source candidate from Overture Maps Places.`,
  };
}

async function main() {
  const filePath = inputPath();
  if (!filePath) throw new Error('Usage: node scripts/network-import-overture.js <places.json|places.ndjson> [--state=MA] [--limit=1000] [--dry-run]');
  const dryRun = hasFlag('dry-run');
  const limit = Number(argValue('limit', '0')) || 0;
  const stateFilter = stateCode(argValue('state', '')) || null;
  const sourceUrl = argValue('source-url', 'https://docs.overturemaps.org/guides/places/');
  let seen = 0;
  let matched = 0;
  let imported = 0;
  let failed = 0;

  await readJsonRecords(filePath, async (record, rowNumber) => {
    if (limit && seen >= limit) return false;
    seen += 1;
    const candidate = candidateFromOverture(record, sourceUrl);
    if (!candidate) return true;
    if (stateFilter && candidate.location?.state !== stateFilter) return true;
    matched += 1;
    if (dryRun) return true;
    try {
      const saved = await upsertNetworkImportCandidate(candidate);
      if (saved?.id) imported += 1;
    } catch (err) {
      failed += 1;
      console.warn(`[network-import-overture] row ${rowNumber} skipped: ${err?.message || err}`);
    }
    return true;
  });

  console.log(`[network-import-overture] seen=${seen} matched=${matched} imported=${imported} failed=${failed} dryRun=${dryRun}`);
}

main()
  .catch((err) => {
    console.error('[network-import-overture] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeNetworkDbPool(); } catch {}
  });
