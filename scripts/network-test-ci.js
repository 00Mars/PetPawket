// scripts/network-test-ci.js
// One-shot runner: migrate + seed + real DB integration tests.
import 'dotenv/config';
import { spawn } from 'node:child_process';

const allowFallback = process.env.ALLOW_DB_FALLBACK === '1';
const targetDb = process.env.DATABASE_URL_TEST || (allowFallback ? process.env.DATABASE_URL || '' : '');
if (!targetDb) {
  console.error('[network-test-ci] Missing DATABASE_URL_TEST. Run: npm run db:test:setup');
  process.exit(1);
}

if (!process.env.DATABASE_URL_TEST && allowFallback) {
  console.warn('[network-test-ci] DATABASE_URL_TEST not set; using DATABASE_URL because ALLOW_DB_FALLBACK=1.');
}

function runStep(name, args, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[network-test-ci] ${name}...`);
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: targetDb,
        DATABASE_URL_TEST: targetDb,
        RUN_NETWORK_DB_TESTS: '1',
        ...env,
      },
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${name} failed with exit code ${code}`));
    });
  });
}

async function main() {
  await runStep('Running migrations', ['scripts/migrate.js']);
  await runStep('Seeding network listings', ['scripts/network-seed.js']);
  await runStep('Running network DB integration tests', ['--test', 'tests/networkDB.integration.test.js']);
  console.log('[network-test-ci] Complete.');
}

main().catch((err) => {
  console.error('[network-test-ci] Failed:', err?.message || err);
  process.exit(1);
});
