// scripts/network-import-census-places.js
// Imports US Census Gazetteer place and county-subdivision centroids for Network radius autocomplete.
import 'dotenv/config';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import readline from 'readline';
import { closeNetworkDbPool, pool } from '../networkDB.pg.js';
import { argValue, hasFlag, text } from './network-import-shared.js';

const DEFAULT_YEAR = 2025;
const CACHE_DIR = path.resolve('.cache', 'network-places');
const SOURCES = [
  {
    source: 'census_place',
    kind: 'place',
    zipName: (year) => `${year}_Gaz_place_national.zip`,
    txtName: (year) => `${year}_Gaz_place_national.txt`,
  },
  {
    source: 'census_cousub',
    kind: 'cousub',
    zipName: (year) => `${year}_Gaz_cousubs_national.zip`,
    txtName: (year) => `${year}_Gaz_cousubs_national.txt`,
  },
  {
    source: 'census_zcta',
    kind: 'zcta',
    zipName: (year) => `${year}_Gaz_zcta_national.zip`,
    txtName: (year) => `${year}_Gaz_zcta_national.txt`,
  },
];
const DISPLAY_SUFFIXES = [
  'charter township',
  'unified government',
  'metropolitan government',
  'municipality',
  'township',
  'borough',
  'village',
  'comunidad',
  'zona urbana',
  'city',
  'town',
  'CDP',
];
const COUSUB_ALLOWED_SUFFIX_RE = /\b(city|town|village|borough|municipality|township|charter township)$/i;
const COUSUB_BLOCKED_SUFFIX_RE = /\b(CCD|district|division|precinct|unorganized territory| UT|plantation|grant|gore|purchase|location)$/i;

function sourceUrl(year, source) {
  return `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/${year}_Gazetteer/${source.zipName(year)}`;
}

function stateSet(value) {
  const raw = text(value, 1000);
  if (!raw) return null;
  return new Set(raw.split(',').map((part) => text(part, 8)?.toUpperCase()).filter((part) => /^[A-Z]{2}$/.test(part)));
}

function cleanName(name) {
  let out = text(name, 160) || '';
  for (const suffix of DISPLAY_SUFFIXES) {
    const re = new RegExp(`\\s+${suffix.replace(/\s+/g, '\\s+')}$`, 'i');
    if (re.test(out)) {
      out = out.replace(re, '').trim();
      break;
    }
  }
  return out;
}

function placeKind(sourceKind, canonicalName, row = {}) {
  if (sourceKind === 'zcta') return 'zip';
  const name = text(canonicalName, 180) || '';
  if (/\bcharter township$/i.test(name)) return 'township';
  for (const suffix of DISPLAY_SUFFIXES) {
    const re = new RegExp(`\\b${suffix.replace(/\s+/g, '\\s+')}$`, 'i');
    if (re.test(name)) return suffix.toLowerCase().replace(/\s+/g, '_');
  }
  if (sourceKind === 'place' && String(row.LSAD || '') === '57') return 'cdp';
  return sourceKind;
}

function includeRow(sourceKind, row) {
  if (sourceKind === 'zcta') {
    const geoid = text(row.GEOID, 12);
    const lat = Number(row.INTPTLAT);
    const lng = Number(row.INTPTLONG);
    return !!(geoid && /^\d{5}$/.test(geoid) && Number.isFinite(lat) && Number.isFinite(lng));
  }
  const state = text(row.USPS, 8)?.toUpperCase();
  const geoid = text(row.GEOID, 40);
  const canonical = text(row.NAME, 180);
  const lat = Number(row.INTPTLAT);
  const lng = Number(row.INTPTLONG);
  if (!state || !geoid || !canonical || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (sourceKind === 'place') return true;
  if (COUSUB_BLOCKED_SUFFIX_RE.test(canonical)) return false;
  return COUSUB_ALLOWED_SUFFIX_RE.test(canonical);
}

function parseDelimited(line, delimiter) {
  return line.split(delimiter).map((cell) => cell.trim());
}

async function download(url, targetPath) {
  if (fsSync.existsSync(targetPath) && !hasFlag('refresh')) return;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  console.log(`[network-places] downloading ${url}`);
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'PetPawketNetworkPlaces/1.0 (radius autocomplete)' },
  });
  if (!resp.ok) throw new Error(`Download failed ${resp.status}: ${url}`);
  const body = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(targetPath, body);
}

function unzipTextStream(zipPath, txtName) {
  const child = spawn('unzip', ['-p', zipPath, txtName], { stdio: ['ignore', 'pipe', 'inherit'] });
  child.on('error', (err) => {
    throw err;
  });
  return child.stdout;
}

async function upsertBatch(items, dryRun = false) {
  if (!items.length || dryRun) return;
  const params = [];
  const values = [];
  items.forEach((item, index) => {
    const base = index * 9;
    values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},NOW())`);
    params.push(
      item.source,
      item.source_record_id,
      item.source_year,
      item.name,
      item.canonical_name,
      item.state,
      item.place_kind,
      item.latitude,
      item.longitude
    );
  });
  await pool.query(
    `INSERT INTO network_place_index
       (source, source_record_id, source_year, name, canonical_name, state, place_kind, latitude, longitude, updated_at)
     VALUES ${values.join(',')}
     ON CONFLICT (source, source_record_id) DO UPDATE SET
       source_year = EXCLUDED.source_year,
       name = EXCLUDED.name,
       canonical_name = EXCLUDED.canonical_name,
       state = EXCLUDED.state,
       place_kind = EXCLUDED.place_kind,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       updated_at = NOW()`,
    params
  );
}

async function importSource(source, options) {
  const zipPath = path.join(CACHE_DIR, source.zipName(options.year));
  await download(sourceUrl(options.year, source), zipPath);

  let seen = 0;
  let matched = 0;
  let imported = 0;
  let headers = null;
  let delimiter = '\t';
  let batch = [];
  const stream = readline.createInterface({
    input: unzipTextStream(zipPath, source.txtName(options.year)),
    crlfDelay: Infinity,
  });

  for await (const line of stream) {
    if (!line.trim()) continue;
    if (!headers) {
      delimiter = line.includes('|') ? '|' : '\t';
      headers = parseDelimited(line, delimiter);
      continue;
    }
    seen += 1;
    const cells = parseDelimited(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] || '';
    });
    const state = source.kind === 'zcta' ? 'US' : text(row.USPS, 8)?.toUpperCase();
    if (options.states && !options.states.has(state)) continue;
    if (!includeRow(source.kind, row)) continue;
    const canonicalName = text(row.NAME || row.GEOID, 180);
    const name = source.kind === 'zcta' ? text(row.GEOID, 12) : cleanName(canonicalName);
    if (!name) continue;
    matched += 1;
    batch.push({
      source: source.source,
      source_record_id: text(row.GEOID, 40),
      source_year: options.year,
      name,
      canonical_name: canonicalName,
      state,
      place_kind: placeKind(source.kind, canonicalName, row),
      latitude: Number(row.INTPTLAT),
      longitude: Number(row.INTPTLONG),
    });
    if (batch.length >= options.batchSize) {
      await upsertBatch(batch, options.dryRun);
      imported += options.dryRun ? 0 : batch.length;
      batch = [];
    }
    if (options.limit && matched >= options.limit) break;
  }
  await upsertBatch(batch, options.dryRun);
  imported += options.dryRun ? 0 : batch.length;
  return { source: source.source, seen, matched, imported };
}

async function main() {
  const year = Number(argValue('year', String(DEFAULT_YEAR))) || DEFAULT_YEAR;
  const dryRun = hasFlag('dry-run');
  const states = stateSet(argValue('states', ''));
  const batchSize = Math.min(1000, Math.max(50, Number(argValue('batch-size', '500')) || 500));
  const limit = Math.max(0, Number(argValue('limit', '0')) || 0);
  if (!dryRun) {
    await pool.query('DELETE FROM network_place_index WHERE source = ANY($1::text[])', [SOURCES.map((source) => source.source)]);
  }
  const summary = [];
  for (const source of SOURCES) {
    summary.push(await importSource(source, { year, dryRun, states, batchSize, limit }));
  }
  const total = summary.reduce((sum, row) => sum + row.imported, 0);
  console.log(JSON.stringify({ ok: true, year, dryRun, states: states ? Array.from(states) : 'all', total, sources: summary }, null, 2));
}

main()
  .catch((err) => {
    console.error('[network-places] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeNetworkDbPool();
  });
