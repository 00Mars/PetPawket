// scripts/network-coverage-audit.js
import 'dotenv/config';
import fs from 'fs/promises';
import { closeNetworkDbPool, pool } from '../networkDB.pg.js';
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

function rowKey(row) {
  return stateCode(row.state) || 'UNKNOWN';
}

async function readPlanJobs(planPath) {
  const path = text(planPath, 2048);
  if (!path) return new Map();
  try {
    const plan = JSON.parse(await fs.readFile(path, 'utf8'));
    const jobs = Array.isArray(plan.jobs) ? plan.jobs : [];
    return jobs.reduce((acc, job) => {
      const state = stateCode(job?.args?.state);
      if (!state) return acc;
      if (!acc.has(state)) acc.set(state, []);
      acc.get(state).push(job);
      return acc;
    }, new Map());
  } catch (err) {
    console.warn(`[network-coverage-audit] source plan skipped: ${err?.message || err}`);
    return new Map();
  }
}

async function listingCounts(states) {
  const { rows } = await pool.query(
    `SELECT UPPER(state) AS state, COUNT(DISTINCT id)::int AS count
     FROM network_listings
     WHERE state IS NOT NULL
       AND UPPER(state) = ANY($1::text[])
     GROUP BY UPPER(state)`,
    [states]
  );
  return new Map(rows.map((row) => [rowKey(row), Number(row.count || 0)]));
}

async function candidateCounts(states) {
  const { rows } = await pool.query(
    `SELECT
       UPPER(state) AS state,
       source,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (
         WHERE status IN ('new','needs_review','approved')
           AND city IS NOT NULL
           AND state IS NOT NULL
           AND category_primary <> 'other'
           AND (phone IS NOT NULL OR LOWER(website_url) LIKE 'https://%')
       )::int AS ready,
       COUNT(*) FILTER (WHERE phone IS NOT NULL OR website_url IS NOT NULL)::int AS with_contact,
       COUNT(*) FILTER (WHERE city IS NOT NULL AND state IS NOT NULL)::int AS with_location
     FROM network_import_candidates
     WHERE state IS NOT NULL
       AND UPPER(state) = ANY($1::text[])
     GROUP BY UPPER(state), source
     ORDER BY UPPER(state), source`,
    [states]
  );
  const map = new Map();
  for (const row of rows) {
    const state = rowKey(row);
    if (!map.has(state)) map.set(state, {});
    map.get(state)[row.source] = {
      total: Number(row.total || 0),
      ready: Number(row.ready || 0),
      with_contact: Number(row.with_contact || 0),
      with_location: Number(row.with_location || 0),
    };
  }
  return map;
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
     ),
     duplicate_hosts AS (
       SELECT
         UPPER(state),
         LOWER(city),
         REGEXP_REPLACE(LOWER(SPLIT_PART(REGEXP_REPLACE(website_url, '^https?://(www\\.)?', ''), '/', 1)), '^www\\.', '')
       FROM network_listings
       WHERE state IS NOT NULL
         AND city IS NOT NULL
         AND website_url IS NOT NULL
         AND website_url <> ''
       GROUP BY 1, 2, 3
       HAVING COUNT(*) > 1
     )
     SELECT
       (SELECT COUNT(*)::int FROM duplicate_names) AS duplicate_name_groups,
       (SELECT COUNT(*)::int FROM duplicate_phones) AS duplicate_phone_groups,
       (SELECT COUNT(*)::int FROM duplicate_hosts) AS duplicate_host_groups`
  );
  return rows[0] || {};
}

function sourceReady(sources, source) {
  return Number(sources?.[source]?.ready || 0);
}

function sourceTotal(sources, source) {
  return Number(sources?.[source]?.total || 0);
}

function commandForState(row, planJobs, planPath) {
  if (row.public_gap > 0 && row.ready_candidates > 0) {
    return `npm run network:promote:candidates -- --states=${row.state} --targets=${row.state}:${row.target}`;
  }
  const job = planJobs.get(row.state)?.[0];
  if (job) {
    return `OVERTUREMAPS_CMD=.cache/overture-venv/bin/overturemaps npm run network:import:plan -- --plan=${planPath} --replace-type=osm:overture_bbox --job=${job.id} --dry-run`;
  }
  return '';
}

function printTable(rows, options) {
  const headers = ['state', 'target', 'public', 'gap', 'ready', 'overture', 'osm', 'irs', 'next'];
  const lines = [headers.join('\t')];
  for (const row of rows) {
    if (options.gapsOnly && row.public_gap <= 0) continue;
    lines.push([
      row.state,
      row.target,
      row.public_count,
      row.public_gap,
      row.ready_candidates,
      `${row.overture_ready}/${row.overture_total}`,
      `${row.osm_ready}/${row.osm_total}`,
      `${row.irs_ready}/${row.irs_total}`,
      row.next_command,
    ].join('\t'));
  }
  console.log(lines.join('\n'));
}

async function main() {
  const includeDc = hasFlag('include-dc');
  const baseline = Math.max(0, Number(argValue('baseline', '5')) || 0);
  const states = parseStateList(argValue('states', ''), includeDc ? [...US_STATES, 'DC'] : US_STATES);
  const overrides = parseTargetOverrides(argValue('targets', ''));
  const planPath = text(argValue('plan', 'data/pawket-network-national-osm-plan.json'), 2048);
  const [publicByState, candidatesByState, planJobs, trust, duplicates] = await Promise.all([
    listingCounts(states),
    candidateCounts(states),
    readPlanJobs(planPath),
    trustSummary(),
    duplicateSummary(),
  ]);

  const rows = states.map((state) => {
    const target = targetForState(state, baseline, overrides);
    const sources = candidatesByState.get(state) || {};
    const publicCount = publicByState.get(state) || 0;
    const readyCandidates = Object.values(sources).reduce((sum, item) => sum + Number(item.ready || 0), 0);
    const row = {
      state,
      target,
      public_count: publicCount,
      public_gap: Math.max(0, target - publicCount),
      ready_candidates: readyCandidates,
      overture_ready: sourceReady(sources, 'overture'),
      overture_total: sourceTotal(sources, 'overture'),
      osm_ready: sourceReady(sources, 'osm'),
      osm_total: sourceTotal(sources, 'osm'),
      irs_ready: sourceReady(sources, 'irs_eo_bmf'),
      irs_total: sourceTotal(sources, 'irs_eo_bmf'),
      sources,
    };
    row.next_command = commandForState(row, planJobs, planPath);
    return row;
  });

  const summary = {
    states: rows.length,
    below_target: rows.filter((row) => row.public_gap > 0).length,
    with_ready_candidates: rows.filter((row) => row.ready_candidates > 0).length,
    trust: {
      total: Number(trust.total || 0),
      non_unclaimed: Number(trust.non_unclaimed || 0),
      partnered: Number(trust.partnered || 0),
      charm_enabled: Number(trust.charm_enabled || 0),
    },
    duplicates: {
      name_groups: Number(duplicates.duplicate_name_groups || 0),
      phone_groups: Number(duplicates.duplicate_phone_groups || 0),
      host_groups: Number(duplicates.duplicate_host_groups || 0),
    },
  };

  if (hasFlag('json')) {
    console.log(JSON.stringify({ summary, rows }, null, 2));
  } else {
    console.log(`[network-coverage-audit] states=${summary.states} below_target=${summary.below_target} with_ready_candidates=${summary.with_ready_candidates} public_total=${summary.trust.total} non_unclaimed=${summary.trust.non_unclaimed} partnered=${summary.trust.partnered} charm_enabled=${summary.trust.charm_enabled} duplicate_names=${summary.duplicates.name_groups} duplicate_phones=${summary.duplicates.phone_groups} duplicate_hosts=${summary.duplicates.host_groups}`);
    printTable(rows, { gapsOnly: hasFlag('gaps-only') });
  }
}

main()
  .catch((err) => {
    console.error('[network-coverage-audit] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeNetworkDbPool(); } catch {}
  });
