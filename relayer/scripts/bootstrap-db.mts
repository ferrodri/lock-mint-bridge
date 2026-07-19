// Bootstraps the target database from $DATABASE_URL: creates the DB if missing,
// then applies SCHEMA_SQL so a fresh install has all tables/indexes.
// DDL is idempotent (IF NOT EXISTS + DO $$ EXCEPTION for the ENUMs), so safe to re-run.
// Take-home convenience; production should run schema migrations from CI/CD instead.

import pg from 'pg';
import { createPool } from '../src/db/kysely.ts';
import { SCHEMA_SQL } from '../src/db/schema.ts';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required (set in .env or your shell environment)');
  process.exit(1);
}

// CREATE DATABASE can't run in the target DB itself and has no IF NOT EXISTS,
// so connect to the maintenance `postgres` DB and conditionally create.
const parsed = new URL(databaseUrl);
const targetDbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
if (!targetDbName) {
  console.error('DATABASE_URL must include a database name in the path');
  process.exit(1);
}

const adminUrl = new URL(databaseUrl);
adminUrl.pathname = '/postgres';

const adminPool = new pg.Pool({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5_000 });
try {
  const exists = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDbName]);
  if (exists.rowCount === 0) {
    const quotedIdent = `"${targetDbName.replace(/"/g, '""')}"`;
    await adminPool.query(`CREATE DATABASE ${quotedIdent}`);
    console.log(`database ${targetDbName} created`);
  } else {
    console.log(`database ${targetDbName} already exists`);
  }
} finally {
  await adminPool.end();
}

const pool = createPool(databaseUrl);
try {
  await pool.query(SCHEMA_SQL);
  console.log('schema applied');
} finally {
  await pool.end();
}
