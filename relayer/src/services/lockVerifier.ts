import type { FastifyBaseLogger } from 'fastify';
import type { PublicClient } from 'viem';
import { FINALITY_CONFIRMATIONS, FINALITY_POLICY, MAX_VERIFY_AGE_MS, POLL_INTERVAL_MS } from '../config/chains';
import type { AppDb } from '../db/kysely';

export class LockVerifier {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly logger: FastifyBaseLogger;

  constructor(
    private readonly db: AppDb,
    private readonly client: PublicClient,
    logger: FastifyBaseLogger
  ) {
    this.logger = logger.child({ component: 'LockVerifier' });
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
      const finalBlockNumber = await this.getFinalBlockNumber();
      // Promote before expiring so a lock that is both final and past the age cutoff mints rather
      // than fails.
      await this.promoteFinalized(finalBlockNumber);
      await this.expireStale();
    } catch (err) {
      this.logger.error({ err }, 'verifier tick failed');
    } finally {
      this.running = false;
    }
  }

  // Highest source-chain block number currently considered final under the configured policy.
  private async getFinalBlockNumber(): Promise<bigint> {
    if (FINALITY_POLICY === 'confirmations') {
      const head = await this.client.getBlockNumber();
      const threshold = head + 1n - FINALITY_CONFIRMATIONS;
      return threshold > 0n ? threshold : 0n;
    }
    const block = await this.client.getBlock({ blockTag: FINALITY_POLICY });
    return block.number ?? 0n;
  }

  private async promoteFinalized(finalBlockNumber: bigint): Promise<void> {
    const result = await this.db
      .updateTable('locks')
      .set({ status: 'pending', updated_at: new Date() })
      .where('status', '=', 'pending_verification')
      .where('block_number', '<=', finalBlockNumber)
      .executeTakeFirst();
    const count = Number(result.numUpdatedRows);
    if (count > 0) this.logger.info({ count }, 'locks finalized; ready to mint');
  }

  private async expireStale(): Promise<void> {
    const cutoff = new Date(Date.now() - MAX_VERIFY_AGE_MS);
    const result = await this.db
      .updateTable('locks')
      .set({ status: 'failed', updated_at: new Date() })
      .where('status', '=', 'pending_verification')
      .where('created_at', '<', cutoff)
      .executeTakeFirst();
    const count = Number(result.numUpdatedRows);
    if (count > 0) this.logger.warn({ count }, 'locks failed: not finalized before MAX_VERIFY_AGE_MS');
  }
}
