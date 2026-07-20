import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { sql } from 'kysely';
import { createDb, createPool, type AppDb } from '../src/db/kysely';
import { SCHEMA_SQL } from '../src/db/schema';

// DB-backed tests for the submit -> verify -> claim invariants. Gated on DATABASE_URL_TEST so the
// pure unit suite still runs without Postgres. Point it at a throwaway database:
//   DATABASE_URL_TEST=postgres://postgres:postgres@localhost:5432/relayer_test pnpm test
const testUrl = process.env.DATABASE_URL_TEST;
const maybe = testUrl ? test : test.skip;

let db: AppDb;
let pool: ReturnType<typeof createPool>;

const SOURCE_CHAIN_ID = 11155420;
const DEST_CHAIN_ID = 84532;

function hash(seed: string): string {
  return `0x${seed.repeat(64).slice(0, 64)}`;
}

// Mirrors POST /locks: the receipt is decoded up front, so the row is fully populated at insert.
// Idempotent on send_id (the on-chain idempotency key).
async function submit(txHash: string, sendId: string): Promise<void> {
  await db
    .insertInto('locks')
    .values({
      id: randomUUID(),
      send_id: sendId,
      source_chain_id: SOURCE_CHAIN_ID,
      dest_chain_id: DEST_CHAIN_ID,
      hash: txHash,
      recipient: '0x2222222222222222222222222222222222222222',
      amount: 1000n,
      payload: Buffer.from('deadbeef', 'hex'),
      message_sender: Buffer.from('c0ffee', 'hex'),
      status: 'pending_verification'
    })
    .onConflict((oc) => oc.column('send_id').doNothing())
    .execute();
}

// Mirrors LockVerifier: once final, flip 'pending_verification' -> 'pending'.
async function verify(txHash: string): Promise<void> {
  await db
    .updateTable('locks')
    .set({ status: 'pending' })
    .where('hash', '=', txHash)
    .where('status', '=', 'pending_verification')
    .execute();
}

before(async () => {
  if (!testUrl) return;
  pool = createPool(testUrl);
  db = createDb(pool);
  await pool.query(SCHEMA_SQL);
  await pool.query('TRUNCATE locks, mint_broadcasts RESTART IDENTITY CASCADE');
});

after(async () => {
  if (db) await db.destroy();
});

maybe('re-submitting the same lock does not create a duplicate row', async () => {
  const sendId = hash('a');
  await submit(hash('1'), sendId);
  await submit(hash('1'), sendId);
  const rows = await db.selectFrom('locks').select('id').where('send_id', '=', sendId).execute();
  assert.equal(rows.length, 1);
});

maybe('verification flips a finalized lock to pending', async () => {
  const txHash = hash('2');
  await submit(txHash, hash('d'));
  await verify(txHash);
  const row = await db
    .selectFrom('locks')
    .select(['status', 'send_id'])
    .where('hash', '=', txHash)
    .executeTakeFirstOrThrow();
  assert.equal(row.status, 'pending');
  assert.equal(row.send_id, hash('d'));
});

maybe('send_id is the idempotency key: a second claim on it dedupes to one row', async () => {
  const sendId = hash('b');
  await submit(hash('3'), sendId);
  await submit(hash('4'), sendId);
  const rows = await db.selectFrom('locks').select('id').where('send_id', '=', sendId).execute();
  assert.equal(rows.length, 1);
});

maybe('a pending lock is claimed exactly once', async () => {
  const txHash = hash('5');
  await submit(txHash, hash('c'));
  await verify(txHash);

  const claim = () =>
    sql<{ id: string }>`
      UPDATE locks SET status = 'minting', updated_at = now()
      WHERE id IN (
        SELECT id FROM locks WHERE status = 'pending' AND hash = ${txHash}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `.execute(db);

  const first = await claim();
  const second = await claim();
  assert.equal(first.rows.length, 1);
  assert.equal(second.rows.length, 0);
});
