// utils/networkGeocode.js
import fetch from 'node-fetch';

const USER_AGENT = process.env.PAWKET_NETWORK_GEOCODE_UA || 'PetPawketNetwork/1.0 (ops@petpawket.com)';
const NOMINATIM_BASE = process.env.PAWKET_NETWORK_GEOCODE_BASE || 'https://nominatim.openstreetmap.org';
const MIN_INTERVAL_MS = Math.max(1100, Number(process.env.PAWKET_NETWORK_GEOCODE_THROTTLE_MS || 1200));

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
    state: hit.address?.state_code || hit.address?.state || null,
    postalCode: hit.address?.postcode || null,
    raw: hit,
  };
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
