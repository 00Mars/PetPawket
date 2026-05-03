// db/pgClient.js
import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL || process.env.PGCLIENT_DATABASE_URL || '';
if (process.env.NODE_ENV === 'production' && !connectionString) {
  throw new Error('DATABASE_URL is required in production.');
}

const ssl = process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined;

export const pgClient = new Client(connectionString ? {
  connectionString,
  ssl,
} : {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'petpawket',
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT || 5432),
  ssl,
});

pgClient.connect().catch(err => {
  console.error('[pgClient] PostgreSQL connection error:', err);
});
