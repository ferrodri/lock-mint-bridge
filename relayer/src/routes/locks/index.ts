import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { sql } from 'kysely';
import { randomUUID } from 'node:crypto';
import type { Hex } from 'viem';
import { z } from 'zod';
import { DEST_CHAIN, SOURCE_CHAIN } from '../../config/chains';
import { decodeLockReceipt } from '../../services/lockDecoder';

const bytes32 = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, 'invalid 0x bytes32')
  .transform((s) => s.toLowerCase());

const LockBody = z.object({ hash: bytes32 });

const SendIdParam = z.object({ sendId: bytes32 });

// The idempotency key is the on-chain sendId (bytes32) per the IETF Idempotency-Key draft
// (https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/). Unlike a random
// UUID it is a deterministic, chain-derived identity of the exact lock->mint op, so retries and
// races dedupe to a single mint. It is still an untrusted claim: it must equal the sendId we
// re-derive from the lock tx below.
const IdempotencyKey = z.object({ 'idempotency-key': bytes32 });

// TODO: this type and too frontend, also say other solutions could be better but out of scope,
interface LockView {
  hash: string;
  sendId: string | null;
  status: string;
  amount: string | null;
  recipient: string | null;
  mintTxHash: string | null;
  broadcasts: unknown[];
}

const locks: FastifyPluginAsync = async (fastify) => {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // The client sends the on-chain sendId as the Idempotency-Key and the lock tx hash as evidence.
  app.post('/locks', { schema: { headers: IdempotencyKey, body: LockBody } }, async (req, reply) => {
    const { hash } = req.body;
    const sendId = req.headers['idempotency-key'];

    const existing = await fastify.db
      .selectFrom('locks')
      .select('status')
      .where('send_id', '=', sendId)
      .executeTakeFirst();
    if (existing) return reply.code(202).send({ hash, sendId, status: existing.status });

    const decoded = await decodeLockReceipt(fastify.sourceClient, hash as Hex);
    if (decoded.status === 'not_found') {
      // No receipt for this hash: either an unknown/bad hash, or a just-mined tx our RPC hasn't seen
      // yet. We can't tell them apart, so it's a plain 404 and the caller may retry a bounded number
      // of times.
      return reply.code(404).send({ error: 'not_found' });
    }
    if (decoded.status === 'reverted') {
      return reply.code(422).send({ error: 'reverted' });
    }
    if (decoded.status === 'not_a_lock') {
      return reply.code(422).send({ error: 'not_a_lock' });
    }

    const { lock } = decoded;
    if (lock.sendId.toLowerCase() !== sendId) {
      // The Idempotency-Key does not match the sendId this lock tx actually emitted: reject the claim.
      return reply.code(422).send({ error: 'idempotency_key_mismatch' });
    }

    // A concurrent request may win the race on send_id. ON CONFLICT DO UPDATE (a no-op self-assign)
    // instead of DO NOTHING so RETURNING always yields the row and reports the winner's real current
    // status, rather than us guessing the initial one.
    const upserted = await fastify.db
      .insertInto('locks')
      .values({
        id: randomUUID(),
        send_id: lock.sendId,
        source_chain_id: SOURCE_CHAIN.id,
        dest_chain_id: DEST_CHAIN.id,
        hash,
        recipient: lock.recipient,
        amount: lock.amount,
        // Both are replayed verbatim into deliver(): payload is the opaque ERC-7786 message body
        // (BridgeFungible abi.encode(sourceUserInterop, recipient, amount)); message_sender is the
        // ERC-7930 interoperable address of the source LockBridge (the MessageSent `sender`).
        payload: Buffer.from(lock.payload.slice(2), 'hex'),
        message_sender: Buffer.from(lock.messageSender.slice(2), 'hex'),
        block_number: lock.blockNumber,
        status: 'pending_verification'
      })
      .onConflict((oc) => oc.column('send_id').doUpdateSet({ id: sql`locks.id` }))
      .returning('status')
      .executeTakeFirstOrThrow();

    return reply.code(202).send({ hash, sendId, status: upserted.status });
  });

  app.get('/locks/:sendId', { schema: { params: SendIdParam } }, async (req, reply) => {
    const { sendId } = req.params;
    const result = await sql<LockView>`
      SELECT
        locks.hash           AS "hash",
        locks.send_id        AS "sendId",
        locks.status         AS status,
        locks.amount::text   AS amount,
        locks.recipient      AS recipient,
        (
          SELECT hash FROM mint_broadcasts
          WHERE lock_id = locks.id AND status = 'succeeded'
          LIMIT 1
        ) AS "mintTxHash",
        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'hash',           hash,
                'status',         status,
                'nonce',          nonce::text,
                'bumpMultiplier', bump_multiplier,
                'broadcastedAt',  broadcasted_at
              ) ORDER BY broadcasted_at DESC
            ),
            '[]'::jsonb
          )
          FROM mint_broadcasts WHERE lock_id = locks.id
        ) AS broadcasts
      FROM locks
      WHERE locks.send_id = ${sendId}
      LIMIT 1
    `.execute(fastify.db);

    const row = result.rows[0];
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return reply.code(200).send(row);
  });
};

export default locks;
