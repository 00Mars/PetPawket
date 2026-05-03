// apps/charmfoundation/db/pg.js
import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';
import { fileURLToPath } from 'url';

const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const connectionString = process.env.CHARM_DATABASE_URL || process.env.DATABASE_URL || '';
const useSSL = process.env.PGSSLMODE === 'require'
  ? { rejectUnauthorized: false }
  : undefined;

const pool = connectionString
  ? new Pool({ connectionString, ssl: useSSL })
  : null;

export function hasDb() {
  return !!pool;
}

export async function query(sql, params = []) {
  if (!pool) {
    const err = new Error('DB_NOT_CONFIGURED');
    err.code = 'DB_NOT_CONFIGURED';
    throw err;
  }
  return pool.query(sql, params);
}

export async function pingDb() {
  if (!pool) return false;
  const { rows } = await pool.query('SELECT 1 AS ok;');
  return rows[0]?.ok === 1;
}

export default { query, pingDb, hasDb };
