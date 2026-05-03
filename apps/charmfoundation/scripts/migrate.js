// apps/charmfoundation/scripts/migrate.js
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '..', 'db', 'migrations');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function getMigrations() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
    .map((e) => e.name)
    .sort();
}

async function run() {
  const files = await getMigrations();
  if (!files.length) {
    console.log('[charm:migrate] No SQL files found.');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.CHARM_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined
  });

  const client = await pool.connect();
  try {
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const sql = await fs.readFile(fullPath, 'utf8');
      if (!sql.trim()) continue;
      console.log(`[charm:migrate] Running ${file}...`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    }
    console.log('[charm:migrate] Done.');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('[charm:migrate] Failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[charm:migrate] Fatal:', err.message || err);
  process.exit(1);
});
