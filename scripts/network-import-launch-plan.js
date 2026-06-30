// scripts/network-import-launch-plan.js
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { argValue, hasFlag, text } from './network-import-shared.js';

const DEFAULT_PLAN = 'data/pawket-network-source-plan.json';

const TYPE_TO_SCRIPT = {
  irs: 'scripts/network-import-irs-eo-bmf.js',
  osm: 'scripts/network-import-osm-overpass.js',
  overture: 'scripts/network-import-overture.js',
  overture_bbox: 'scripts/network-import-overture-bbox.js',
};

function cliArg(key, value) {
  if (value === true) return `--${key}`;
  if (value === false || value == null || value === '') return null;
  return `--${key}=${String(value)}`;
}

function argsFromObject(args = {}) {
  return Object.entries(args)
    .map(([key, value]) => cliArg(key, value))
    .filter(Boolean);
}

function selectedJobs(plan) {
  const includeDisabled = hasFlag('include-disabled');
  const targetJob = text(argValue('job', ''), 120);
  const startAt = text(argValue('start-at', ''), 120);
  const maxJobs = Number(argValue('max-jobs', '0')) || 0;
  const typeReplacements = parseTypeReplacements(argValue('replace-type', ''));
  let jobs = Array.isArray(plan.jobs) ? plan.jobs : [];
  jobs = jobs.filter((job) => job && typeof job === 'object');
  if (!includeDisabled) jobs = jobs.filter((job) => job.enabled !== false);
  if (targetJob) jobs = jobs.filter((job) => job.id === targetJob);
  if (startAt && !targetJob) {
    const index = jobs.findIndex((job) => job.id === startAt);
    jobs = index >= 0 ? jobs.slice(index) : [];
  }
  if (maxJobs > 0) jobs = jobs.slice(0, maxJobs);
  return jobs.map((job) => {
    const replacement = typeReplacements.get(job.type);
    return replacement ? { ...job, type: replacement, sourcePlanType: job.type } : job;
  });
}

function parseTypeReplacements(value) {
  const raw = text(value, 1000);
  const replacements = new Map();
  if (!raw) return replacements;
  raw.split(',').forEach((part) => {
    const [from, to] = part.split(':').map((item) => text(item, 80));
    if (from && to) replacements.set(from, to);
  });
  return replacements;
}

function commandForJob(job, dryRun) {
  const type = text(job.type, 40);
  const script = TYPE_TO_SCRIPT[type];
  if (!script) throw new Error(`Unsupported source plan job type: ${job.type || 'missing'}`);
  const args = [script];
  if (job.input) args.push(String(job.input));
  args.push(...argsFromObject(job.args || {}));
  if (dryRun && !args.includes('--dry-run')) args.push('--dry-run');
  return { cmd: process.execPath, args };
}

async function runJob(job, dryRun) {
  const { cmd, args } = commandForJob(job, dryRun);
  const typeLabel = job.sourcePlanType ? `${job.sourcePlanType}->${job.type}` : job.type;
  console.log(`[network-import-launch-plan] starting ${job.id} (${typeLabel})`);
  if (job.description) console.log(`[network-import-launch-plan] ${job.description}`);
  console.log(`[network-import-launch-plan] command=${[cmd, ...args].join(' ')}`);
  const started = Date.now();
  const code = await new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.on('close', resolve);
    child.on('error', (err) => {
      console.error(`[network-import-launch-plan] ${job.id} failed to start: ${err?.message || err}`);
      resolve(1);
    });
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (code !== 0) throw new Error(`${job.id} exited with ${code}`);
  console.log(`[network-import-launch-plan] finished ${job.id} in ${seconds}s`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const planPath = text(argValue('plan', DEFAULT_PLAN), 2048) || DEFAULT_PLAN;
  const dryRun = hasFlag('dry-run');
  const raw = await fs.readFile(planPath, 'utf8');
  const plan = JSON.parse(raw);
  const jobs = selectedJobs(plan);
  const delayMs = Math.max(0, Number(argValue('delay-ms', '0')) || 0);
  const continueOnError = hasFlag('continue-on-error');
  const failures = [];
  if (!jobs.length) throw new Error('No source plan jobs selected');
  console.log(`[network-import-launch-plan] plan=${plan.name || planPath} jobs=${jobs.length} dryRun=${dryRun}`);
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    try {
      await runJob(job, dryRun);
    } catch (err) {
      failures.push({ id: job.id, error: err?.message || String(err) });
      console.error(`[network-import-launch-plan] ${job.id} failed: ${err?.message || err}`);
      if (!continueOnError) throw err;
    }
    if (delayMs && i < jobs.length - 1) {
      console.log(`[network-import-launch-plan] waiting ${delayMs}ms before next job`);
      await sleep(delayMs);
    }
  }
  for (const failure of failures) {
    console.log(`[network-import-launch-plan] failure id=${failure.id} error=${failure.error}`);
  }
  if (failures.length && !continueOnError) {
    throw new Error(`${failures.length} source plan job(s) failed`);
  }
  console.log(`[network-import-launch-plan] complete jobs=${jobs.length} dryRun=${dryRun}`);
}

main().catch((err) => {
  console.error('[network-import-launch-plan] failed:', err?.message || err);
  process.exitCode = 1;
});
