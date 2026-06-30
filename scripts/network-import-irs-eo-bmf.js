// scripts/network-import-irs-eo-bmf.js
import 'dotenv/config';
import {
  argValue,
  hasFlag,
  inputPath,
  petCategoryFromText,
  readCsvRows,
  readCsvUrl,
  text,
} from './network-import-shared.js';
import { closeNetworkDbPool, upsertNetworkImportCandidate } from '../networkDB.pg.js';

const IRS_SOI_BASE_URL = 'https://www.irs.gov/pub/irs-soi';
const IRS_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
  'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
  'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'PR',
];
const REGION_FILES = new Map([
  ['1', 'eo1.csv'],
  ['northeast', 'eo1.csv'],
  ['ne', 'eo1.csv'],
  ['2', 'eo2.csv'],
  ['midatlantic', 'eo2.csv'],
  ['mid-atlantic', 'eo2.csv'],
  ['greatlakes', 'eo2.csv'],
  ['great-lakes', 'eo2.csv'],
  ['3', 'eo3.csv'],
  ['gulfpacific', 'eo3.csv'],
  ['gulf-pacific', 'eo3.csv'],
  ['pacific', 'eo3.csv'],
  ['4', 'eo4.csv'],
  ['other', 'eo4.csv'],
  ['all-other', 'eo4.csv'],
  ['all_other', 'eo4.csv'],
]);

function rowValue(row, ...keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim()) return String(row[key]).trim();
    const upper = key.toUpperCase();
    if (row[upper] != null && String(row[upper]).trim()) return String(row[upper]).trim();
    const lower = key.toLowerCase();
    if (row[lower] != null && String(row[lower]).trim()) return String(row[lower]).trim();
  }
  return null;
}

function stateCode(value) {
  const raw = text(value, 24)?.toUpperCase() || '';
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
}

function normalizeRegion(value) {
  return text(value, 40)?.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-') || null;
}

function irsStateUrl(state) {
  return `${IRS_SOI_BASE_URL}/eo_${state.toLowerCase()}.csv`;
}

function irsRegionUrl(region) {
  const key = normalizeRegion(region);
  const file = key ? REGION_FILES.get(key) : null;
  if (!file) throw new Error('Unknown IRS EO BMF region. Use 1, 2, 3, 4, northeast, mid-atlantic, gulf-pacific, or other.');
  return `${IRS_SOI_BASE_URL}/${file}`;
}

function parseStateList(value) {
  const raw = text(value, 1000);
  if (!raw) return [];
  return raw.split(',')
    .map((part) => stateCode(part))
    .filter(Boolean);
}

function uniqueStates(states) {
  return Array.from(new Set(states)).filter((state) => IRS_STATE_CODES.includes(state));
}

function resolveInputSources() {
  const filePath = inputPath();
  const explicitUrl = text(argValue('url', ''), 2048);
  const state = stateCode(argValue('state', ''));
  const downloadState = stateCode(argValue('download-state', ''));
  const states = uniqueStates(parseStateList(argValue('states', '')));
  const allStates = hasFlag('all-states');
  const maxStates = Number(argValue('max-states', '0')) || 0;
  const region = normalizeRegion(argValue('region', ''));
  if (filePath) return [{ kind: 'file', label: filePath, sourceUrl: text(argValue('source-url', ''), 2048) || 'https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf' }];
  if (explicitUrl) return [{ kind: 'url', label: explicitUrl, sourceUrl: explicitUrl }];
  if (region) {
    const url = irsRegionUrl(region);
    return [{ kind: 'url', label: url, sourceUrl: url }];
  }
  if (allStates || states.length) {
    const selected = allStates ? IRS_STATE_CODES : states;
    const limited = maxStates > 0 ? selected.slice(0, maxStates) : selected;
    return limited.map((targetState) => {
      const url = irsStateUrl(targetState);
      return { kind: 'url', label: url, sourceUrl: url, impliedState: targetState };
    });
  }
  if (downloadState || state) {
    const targetState = downloadState || state;
    const url = irsStateUrl(targetState);
    return [{ kind: 'url', label: url, sourceUrl: url, impliedState: targetState }];
  }
  throw new Error('Usage: node scripts/network-import-irs-eo-bmf.js <eo-bmf.csv> [--state=MA] [--limit=1000] [--dry-run] OR --state=MA OR --states=MA,RI OR --all-states OR --region=1 OR --url=https://www.irs.gov/pub/irs-soi/eo_ma.csv');
}

function isAnimalOrganization(row) {
  const name = rowValue(row, 'NAME', 'Organization Name') || '';
  const ntee = rowValue(row, 'NTEE_CD', 'NTEE Code') || '';
  const activity = rowValue(row, 'ACTIVITY', 'Activity') || '';
  const textBlob = `${name} ${ntee} ${activity}`.toLowerCase();
  return /^d/i.test(ntee)
    || /\b(animal|humane society|spca|shelter|rescue|wildlife|veterinary|pet)\b/.test(textBlob);
}

function categoryFor(row) {
  const name = rowValue(row, 'NAME', 'Organization Name') || '';
  const ntee = rowValue(row, 'NTEE_CD', 'NTEE Code') || '';
  if (/\b(shelter|humane society|spca)\b/i.test(name)) return 'shelter';
  if (/\b(rescue)\b/i.test(name)) return 'rescue';
  if (/^d40/i.test(ntee) || /\b(veterinary|vet)\b/i.test(name)) return 'vet';
  return petCategoryFromText(name, ntee) || 'rescue';
}

function candidateFromBmf(row, sourceUrl) {
  if (!isAnimalOrganization(row)) return null;
  const name = text(rowValue(row, 'NAME', 'Organization Name'), 180);
  const state = stateCode(rowValue(row, 'STATE', 'State'));
  const city = text(rowValue(row, 'CITY', 'City'), 120);
  if (!name || !state || !city) return null;
  const category = categoryFor(row);
  const ein = text(rowValue(row, 'EIN'), 32);
  const ntee = text(rowValue(row, 'NTEE_CD', 'NTEE Code'), 40);
  const categoryNote = ntee ? ` IRS NTEE code ${ntee}.` : '';
  return {
    source: 'irs_eo_bmf',
    source_record_id: ein || `${name}-${city}-${state}`,
    source_url: sourceUrl,
    source_payload: row,
    name,
    category_primary: category,
    categories: [category],
    location: {
      address_line1: text(rowValue(row, 'STREET', 'Street'), 180),
      city,
      state,
      postal_code: text(rowValue(row, 'ZIP', 'Zip', 'ZIP_CD'), 20),
    },
    short_description: `${name} is an animal-focused nonprofit source candidate from the IRS EO BMF.${categoryNote}`,
  };
}

async function main() {
  const inputs = resolveInputSources();
  const dryRun = hasFlag('dry-run');
  const limit = Number(argValue('limit', '0')) || 0;
  const perSourceLimit = Number(argValue('per-source-limit', '0')) || 0;
  const explicitStateFilter = stateCode(argValue('filter-state', ''));
  let seen = 0;
  let matched = 0;
  let imported = 0;
  let failed = 0;
  const sourceSummaries = [];

  for (const input of inputs) {
    const sourceUrl = input.sourceUrl;
    const stateFilter = explicitStateFilter || input.impliedState || null;
    const sourceStartSeen = seen;
    const sourceStartMatched = matched;
    const sourceStartImported = imported;
    const sourceStartFailed = failed;
    let sourceSeen = 0;

    const onRow = async (row, rowNumber) => {
      if (limit && seen >= limit) return false;
      if (perSourceLimit && sourceSeen >= perSourceLimit) return false;
      seen += 1;
      sourceSeen += 1;
      const candidate = candidateFromBmf(row, sourceUrl);
      if (!candidate) return true;
      if (stateFilter && candidate.location?.state !== stateFilter) return true;
      matched += 1;
      if (dryRun) return true;
      try {
        const saved = await upsertNetworkImportCandidate(candidate);
        if (saved?.id) imported += 1;
      } catch (err) {
        failed += 1;
        console.warn(`[network-import-irs-eo-bmf] ${input.label} row ${rowNumber} skipped: ${err?.message || err}`);
      }
      return true;
    };

    if (input.kind === 'url') {
      await readCsvUrl(input.label, onRow);
    } else {
      await readCsvRows(input.label, onRow);
    }
    sourceSummaries.push({
      source: input.label,
      seen: seen - sourceStartSeen,
      matched: matched - sourceStartMatched,
      imported: imported - sourceStartImported,
      failed: failed - sourceStartFailed,
    });
    if (limit && seen >= limit) break;
  }

  for (const summary of sourceSummaries) {
    console.log(`[network-import-irs-eo-bmf] source=${summary.source} seen=${summary.seen} matched=${summary.matched} imported=${summary.imported} failed=${summary.failed}`);
  }
  console.log(`[network-import-irs-eo-bmf] sources=${sourceSummaries.length} seen=${seen} matched=${matched} imported=${imported} failed=${failed} dryRun=${dryRun}`);
}

main()
  .catch((err) => {
    console.error('[network-import-irs-eo-bmf] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeNetworkDbPool(); } catch {}
  });
