// utils/networkGeocode.js
import fetch from 'node-fetch';

const USER_AGENT = process.env.PAWKET_NETWORK_GEOCODE_UA || 'PetPawketNetwork/1.0 (ops@petpawket.com)';
const NOMINATIM_BASE = process.env.PAWKET_NETWORK_GEOCODE_BASE || 'https://nominatim.openstreetmap.org';
const MIN_INTERVAL_MS = Math.max(1100, Number(process.env.PAWKET_NETWORK_GEOCODE_THROTTLE_MS || 1200));
const US_STATE_NAMES_BY_CODE = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};
const US_STATE_CODES = new Set(Object.keys(US_STATE_NAMES_BY_CODE));
const US_STATE_CODES_BY_NAME = Object.fromEntries(
  Object.entries(US_STATE_NAMES_BY_CODE).map(([code, name]) => [name.toLowerCase(), code])
);

let lastRequestAt = 0;

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestAt));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

function normalizeQuery(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (/\b(usa|united states)\b/i.test(raw)) return raw;
  return `${raw}, USA`;
}

function parseHit(hit = {}) {
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    city: hit.address?.city || hit.address?.town || hit.address?.village || hit.address?.hamlet || null,
    state: normalizeUsStateCode(hit.address?.state_code || hit.address?.state) || hit.address?.state || null,
    postalCode: hit.address?.postcode || null,
    raw: hit,
  };
}

export function normalizeUsStateCode(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const code = raw.toUpperCase();
  if (US_STATE_CODES.has(code)) return code;
  return US_STATE_CODES_BY_NAME[raw.toLowerCase()] || null;
}

export async function geocodeUsLocation(query) {
  const q = normalizeQuery(query);
  if (!q) return null;

  await throttle();

  const url = new URL('/search', NOMINATIM_BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'us');

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = new Error(`GEOCODE_HTTP_${res.status}`);
    err.code = 'GEOCODE_HTTP';
    throw err;
  }

  const hits = await res.json().catch(() => []);
  if (!Array.isArray(hits) || !hits.length) return null;
  const parsed = parseHit(hits[0]);
  if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
  return {
    queryText: q,
    latitude: parsed.lat,
    longitude: parsed.lng,
    city: parsed.city,
    state: parsed.state,
    postalCode: parsed.postalCode,
    provider: 'nominatim',
    rawResponse: parsed.raw,
  };
}

export function buildGeocodeKey(query) {
  return String(query || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 180);
}
