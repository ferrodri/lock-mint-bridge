import type { FastifyBaseLogger } from 'fastify';
import { sql } from 'kysely';
import type { Hex } from 'viem';
import { CLAIM_BATCH, DEST_GAS_LIMIT, POLL_INTERVAL_MS } from '../config/chains';
import type { AppDb } from '../db/kysely';
import type { MintSender } from './mintSender';

interface ClaimedLock {
  id: string;
  send_id: string;
  payload: Buffer;
  message_sender: Buffer;
}

// Periodically claims verified (pending) locks and dispatches a deliver() job for each. The claim is
// a single guarded UPDATE (`WHERE status='pending' ... FOR UPDATE SKIP LOCKED`) that atomically flips
// rows to 'minting', so a lock is handed to the sender exactly once even across concurrent ticks or
// (future) multiple processor instances.
export class MintProcessor {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly logger: FastifyBaseLogger;

  constructor(
    private readonly db: AppDb,
    private readonly mintSender: MintSender,
    logger: FastifyBaseLogger
  ) {
    this.logger = logger.child({ component: 'MintProcessor' });
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const claimed = await this.claimPending();
      for (const t of claimed) {
        this.mintSender.enqueueNew({
          lockId: t.id,
          receiveId: t.send_id as Hex,
          messageSender: `0x${t.message_sender.toString('hex')}` as Hex,
          payload: `0x${t.payload.toString('hex')}` as Hex,
          gasLimit: DEST_GAS_LIMIT
        });
      }
      if (claimed.length > 0) {
        this.logger.info({ count: claimed.length }, 'dispatched deliver jobs');
      }
    } catch (err) {
      this.logger.error({ err }, 'processor tick failed');
    } finally {
      this.running = false;
    }
  }

  private async claimPending(): Promise<ClaimedLock[]> {
    const result = await sql<ClaimedLock>`
      UPDATE locks SET status = 'minting', updated_at = now()
      WHERE id IN (
        SELECT id FROM locks
        WHERE status = 'pending'
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${CLAIM_BATCH}
      )
      RETURNING id, send_id, payload, message_sender
    `.execute(this.db);
    return result.rows;
  }
}
