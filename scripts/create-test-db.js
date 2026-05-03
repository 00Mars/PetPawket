// scripts/create-test-db.js
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'pg';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function normalizeDbName(input) {
  const cleaned = String(input || '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!cleaned) return null;
  if (/^[0-9]/.test(cleaned)) return `db_${cleaned}`;
  return cleaned;
}

function upsertEnvLine(src, key, value) {
  const lines = src.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.startsWith(`${key}=`));
  const next = `${key}=${value}`;
  if (idx >= 0) lines[idx] = next;
  else lines.push(next);
  return `${lines.join('\n').replace(/\n+$/g, '')}\n`;
}

async function main() {
  const writeEnv = process.argv.includes('--write-env');
  const sourceUrlRaw = process.env.DATABASE_URL;
  if (!sourceUrlRaw) {
    throw new Error('DATABASE_URL is not set.');
  }

  const sourceUrl = new URL(sourceUrlRaw);
  const sourceDbName = decodeURIComponent(sourceUrl.pathname.replace(/^\//, ''));
  if (!sourceDbName) throw new Error('DATABASE_URL must include a database name.');

  const configuredTestName = process.env.DATABASE_URL_TEST_NAME || `${sourceDbName}_test`;
  const testDbName = normalizeDbName(configuredTestName);
  if (!testDbName) throw new Error('Unable to derive a valid test DB name.');

  const adminUrl = new URL(sourceUrlRaw);
  adminUrl.pathname = '/postgres';

  const pool = new Pool({
    connectionString: adminUrl.toString(),
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const existsRes = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1 LIMIT 1', [testDbName]);
    if (!existsRes.rows[0]) {
      await pool.query(`CREATE DATABASE ${quoteIdent(testDbName)}`);
      console.log(`[create-test-db] Created database "${testDbName}".`);
    } else {
      console.log(`[create-test-db] Database "${testDbName}" already exists.`);
    }
  } finally {
    await pool.end();
  }

  const testUrl = new URL(sourceUrlRaw);
  testUrl.pathname = `/${encodeURIComponent(testDbName)}`;

  if (writeEnv) {
    let src = '';
    try {
      src = await fs.readFile(envPath, 'utf8');
    } catch {
      src = '';
    }
    const updated = upsertEnvLine(src, 'DATABASE_URL_TEST', testUrl.toString());
    await fs.writeFile(envPath, updated, 'utf8');
    console.log('[create-test-db] Wrote DATABASE_URL_TEST to .env');
  } else {
    console.log('[create-test-db] DATABASE_URL_TEST (not written):');
    console.log(testUrl.toString());
  }

  console.log(`[create-test-db] Target host=${sourceUrl.hostname} port=${sourceUrl.port || '5432'} db=${testDbName}`);
}

main().catch((err) => {
  console.error('[create-test-db] Failed:', err?.message || err);
  process.exit(1);
});
