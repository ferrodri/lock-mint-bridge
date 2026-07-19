import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { installBigIntJsonSerializer } from '../utils/bigint';
import type { Database } from './types';

pg.types.setTypeParser(pg.types.builtins.INT8, BigInt);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, BigInt);
// Read-side parsers above hand us BigInts; this teaches the write-side JSONB encoder
// (pg -> JSON.stringify) how to emit them. Co-located so all BigInt I/O setup lives together.
installBigIntJsonSerializer();

export type AppDb = Kysely<Database>;

export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({
    connectionString: databaseUrl,
    // Default is 0 (wait forever). Fail fast if PG is unreachable so requests don't hang.
    connectionTimeoutMillis: 5_000
  });
}

export function createDb(pool: pg.Pool): AppDb {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool })
  });
}
