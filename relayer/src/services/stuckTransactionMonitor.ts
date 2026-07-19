import type { FastifyBaseLogger } from 'fastify';
import { sql } from 'kysely';
import type { Hex } from 'viem';
import { DEST_CHAIN, DEST_STUCK_TIMEOUT_MS, DEST_TICK_INTERVAL_MS, FEE_BUMP_LADDER } from '../config/chains';
import type { AppDb } from '../db/kysely';
import type { DeliverJob, MintSender } from './mintSender';

const DEST_CHAIN_ID = DEST_CHAIN.id;

interface StuckRow {
  lock_id: string;
  nonce: bigint;
  bump_multiplier: string;
  gas_limit: bigint;
  send_id: string;
  payload: Buffer;
  message_sender: Buffer;
  prev_max_fee_per_gas: bigint;
  prev_max_priority_fee_per_gas: bigint;
}

// Polls the DB for deliver() broadcasts that have not landed within DEST_STUCK_TIMEOUT_MS and
// enqueues a same-nonce fee-bump replacement (1.5x -> 1.8x -> 2.0x). Same nonce means a replacement,
// never a second execution — safe even though the gateway has no on-chain replay protection.
export class StuckTransactionMonitor {
  private timer: NodeJS.Timeout | null = null;
  private readonly logger: FastifyBaseLogger;

  constructor(
    private readonly db: AppDb,
    private readonly mintSender: MintSender,
    logger: FastifyBaseLogger
  ) {
    this.logger = logger.child({ component: 'StuckTransactionMonitor' });
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      try {
        await this.reconcileOnce();
      } catch (err) {
        this.logger.error({ err }, 'monitor tick failed');
      }
    }, DEST_TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async reconcileOnce(): Promise<void> {
    const stuck = await this.fetchStuck();
    if (stuck.length === 0) return;

    const byLock = Map.groupBy(stuck, (r) => r.lock_id);
    for (const rows of byLock.values()) {
      this.replaceIfStuck(rows);
    }
  }

  private async fetchStuck(): Promise<StuckRow[]> {
    const result = await sql<StuckRow>`
      SELECT
        mint_broadcasts.lock_id,
        mint_broadcasts.nonce,
        mint_broadcasts.bump_multiplier,
        mint_broadcasts.gas_limit,
        locks.send_id,
        locks.payload,
        locks.message_sender,
        (
          SELECT MAX(prev.max_fee_per_gas) FROM mint_broadcasts AS prev
          WHERE prev.lock_id = mint_broadcasts.lock_id
        ) AS prev_max_fee_per_gas,
        (
          SELECT MAX(prev.max_priority_fee_per_gas) FROM mint_broadcasts AS prev
          WHERE prev.lock_id = mint_broadcasts.lock_id
        ) AS prev_max_priority_fee_per_gas
      FROM mint_broadcasts
      INNER JOIN locks ON locks.id = mint_broadcasts.lock_id
      WHERE mint_broadcasts.dest_chain_id = ${DEST_CHAIN_ID}
        AND mint_broadcasts.status = 'submitted'
        AND NOT EXISTS (
          SELECT 1 FROM mint_broadcasts AS terminal_sibling
          WHERE terminal_sibling.lock_id = mint_broadcasts.lock_id
            AND terminal_sibling.status IN ('succeeded', 'failed')
        )
        AND NOT EXISTS (
          SELECT 1 FROM mint_broadcasts AS recent_sibling
          WHERE recent_sibling.lock_id = mint_broadcasts.lock_id
            AND recent_sibling.broadcasted_at > now() - (interval '1 millisecond' * ${DEST_STUCK_TIMEOUT_MS})
        )
    `.execute(this.db);
    return result.rows;
  }

  private replaceIfStuck(rows: StuckRow[]): void {
    const row = rows[0]!;
    const currentTier = Math.max(...rows.map((r) => Number(r.bump_multiplier)));
    const nextTier = FEE_BUMP_LADDER.find((t) => t > currentTier) ?? Number.POSITIVE_INFINITY;

    const job: DeliverJob = {
      lockId: row.lock_id,
      receiveId: row.send_id as Hex,
      messageSender: `0x${row.message_sender.toString('hex')}` as Hex,
      payload: `0x${row.payload.toString('hex')}` as Hex,
      gasLimit: row.gas_limit
    };

    if (nextTier <= 2.0) {
      this.logger.warn(
        { lockId: job.lockId, currentTier, nextTier, nonce: row.nonce.toString() },
        'deliver tx stuck; enqueuing replacement'
      );
    }
    this.mintSender.enqueueReplace({
      job,
      sameNonce: row.nonce,
      nextTier,
      previousFees: {
        maxFeePerGas: row.prev_max_fee_per_gas,
        maxPriorityFeePerGas: row.prev_max_priority_fee_per_gas
      }
    });
  }
}
