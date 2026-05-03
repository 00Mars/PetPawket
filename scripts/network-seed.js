// scripts/network-seed.js
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { upsertListingFromSeed, closeNetworkDbPool } from '../networkDB.pg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.resolve(__dirname, '..', 'public', 'data', 'pawket-network-seed.json');

async function run() {
  const raw = await fs.readFile(seedPath, 'utf8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items) || !items.length) {
    console.log('[network-seed] no items found');
    return;
  }

  let count = 0;
  for (const item of items) {
    const listing = await upsertListingFromSeed(item);
    if (listing?.id) count += 1;
  }

  console.log(`[network-seed] upserted ${count} listings`);
}

run()
  .catch((err) => {
    console.error('[network-seed] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeNetworkDbPool(); } catch {}
  });
