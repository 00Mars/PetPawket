// scripts/network-import-overture-bbox.js
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import {
  argValue,
  hasFlag,
  text,
} from './network-import-shared.js';

const DEFAULT_SOURCE_URL = 'https://docs.overturemaps.org/getting-data/overturemaps-py/';
const VALID_FORMATS = new Set(['geojson', 'geojsonseq']);

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
  return { west, south, east, north, raw: parts.join(',') };
}

function stateCode(value) {
  const raw = text(value, 24)?.toUpperCase() || '';
  return /^[A-Z]{2}$/.test(raw) ? raw : null;
}

function fileExtension(format) {
  return format === 'geojsonseq' ? 'geojsonseq' : 'geojson';
}

function defaultOutputPath(bbox, format) {
  const state = stateCode(argValue('state', '')) || 'US';
  const digest = crypto.createHash('sha1').update(bbox.raw).digest('hex').slice(0, 10);
  const base = `overture-${state.toLowerCase()}-${digest}.${fileExtension(format)}`;
  if (hasFlag('keep-file')) return path.join(process.cwd(), 'data', 'sources', base);
  return path.join(os.tmpdir(), base);
}

async function commandExitsCleanly(cmd, args = []) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function resolveOvertureCommand() {
  const explicitCommand = text(argValue('command', process.env.OVERTUREMAPS_CMD || ''), 400);
  if (explicitCommand) {
    return {
      cmd: explicitCommand,
      argsPrefix: [],
      shell: true,
      display: explicitCommand,
    };
  }

  if (await commandExitsCleanly('overturemaps', ['--help'])) {
    return { cmd: 'overturemaps', argsPrefix: [], shell: false, display: 'overturemaps' };
  }

  if (await commandExitsCleanly('python3', ['-m', 'overturemaps', '--help'])) {
    return { cmd: 'python3', argsPrefix: ['-m', 'overturemaps'], shell: false, display: 'python3 -m overturemaps' };
  }

  if (await commandExitsCleanly('uvx', ['--help'])) {
    return { cmd: 'uvx', argsPrefix: ['overturemaps'], shell: false, display: 'uvx overturemaps' };
  }

  throw new Error('Overture Maps CLI is not available. Install it with `python3 -m pip install --user overturemaps`, then rerun this command.');
}

async function runCommand(cmd, args, options = {}) {
  console.log(`[network-import-overture-bbox] command=${[options.display || cmd, ...args].join(' ')}`);
  const code = await new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: !!options.shell,
      stdio: 'inherit',
    });
    child.on('close', resolve);
    child.on('error', (err) => {
      console.error(`[network-import-overture-bbox] failed to start ${options.display || cmd}: ${err?.message || err}`);
      resolve(1);
    });
  });
  if (code !== 0) throw new Error(`${options.display || cmd} exited with ${code}`);
}

async function main() {
  const bbox = bboxValue();
  if (!bbox) {
    throw new Error('Usage: node scripts/network-import-overture-bbox.js --bbox=west,south,east,north [--state=MA] [--limit=1000] [--dry-run] [--keep-file]');
  }

  const dryRun = hasFlag('dry-run');
  const format = text(argValue('format', 'geojsonseq'), 32) || 'geojsonseq';
  if (!VALID_FORMATS.has(format)) throw new Error('format must be geojson or geojsonseq');

  const outputPath = path.resolve(text(argValue('output', ''), 2048) || defaultOutputPath(bbox, format));
  const keepFile = hasFlag('keep-file') || !!argValue('output', '');
  const state = stateCode(argValue('state', ''));
  const limit = Number(argValue('limit', '0')) || 0;
  const sourceUrl = text(argValue('source-url', DEFAULT_SOURCE_URL), 2048) || DEFAULT_SOURCE_URL;
  const downloader = await resolveOvertureCommand();

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const downloadArgs = [
    ...downloader.argsPrefix,
    'download',
    `--bbox=${bbox.raw}`,
    '-f',
    format,
    '--type=place',
    '-o',
    outputPath,
  ];
  const release = text(argValue('release', ''), 80);
  if (release) downloadArgs.push('-r', release);
  if (hasFlag('no-stac')) downloadArgs.push('--no-stac');

  console.log(`[network-import-overture-bbox] downloading Overture Places bbox=${bbox.raw} format=${format} output=${outputPath}`);
  await runCommand(downloader.cmd, downloadArgs, downloader);

  const importArgs = [
    'scripts/network-import-overture.js',
    outputPath,
    `--source-url=${sourceUrl}`,
  ];
  if (state) importArgs.push(`--state=${state}`);
  if (limit) importArgs.push(`--limit=${limit}`);
  if (dryRun) importArgs.push('--dry-run');

  await runCommand(process.execPath, importArgs, { display: process.execPath });

  if (!keepFile) {
    await fs.rm(outputPath, { force: true });
    await fs.rm(`${outputPath}.state`, { force: true });
    console.log(`[network-import-overture-bbox] removed temp file ${outputPath}`);
  } else {
    console.log(`[network-import-overture-bbox] kept source file ${outputPath}`);
  }
}

main().catch((err) => {
  console.error('[network-import-overture-bbox] failed:', err?.message || err);
  process.exitCode = 1;
});
