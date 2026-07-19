import fp from 'fastify-plugin';
import type pg from 'pg';
import { loadEnv } from '../config/env';
import { createDb, createPool, type AppDb } from '../db/kysely';

export default fp(
  async (fastify) => {
    const env = loadEnv();
    const pool = createPool(env.databaseUrl);
    // Fires when an idle client errors out (PG restart, network blip, server-side idle timeout).
    // Without a handler Node treats it as an unhandled EventEmitter error and can crash the process.
    pool.on('error', (err) => {
      fastify.log.error({ err }, 'idle pg client error');
    });
    const db = createDb(pool);

    fastify.decorate('db', db);
    fastify.decorate('pgPool', pool);

    fastify.addHook('onClose', async () => {
      await db.destroy();
    });
  },
  { name: 'db' }
);

declare module 'fastify' {
  interface FastifyInstance {
    db: AppDb;
    pgPool: pg.Pool;
  }
}
