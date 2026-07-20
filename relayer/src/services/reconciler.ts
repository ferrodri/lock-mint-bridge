import type { FastifyBaseLogger } from 'fastify';
import { sql } from 'kysely';
import type { Hex, PublicClient, TransactionReceipt } from 'viem';
import type { AppDb } from '../db/kysely';
import type { MintSender } from './mintSender';

interface InflightBroadcast {
  broadcast_id: string;
  lock_id: string;
  hash: string;
  nonce: bigint;
}

// Runs once at boot to resolve work that was in flight when the process last died. Closes the
// crash-between-broadcast-and-mark gap so no lock is stranded in 'minting' and, critically, so we
// never issue a fresh (new-nonce) deliver() for a lock whose original tx may still be pending —
// that would risk a double-mint given there is no on-chain replay protection.
export class Reconciler {
  private readonly logger: FastifyBaseLogger;

  constructor(
    private readonly db: AppDb,
    private readonly destClient: PublicClient,
    private readonly mintSender: MintSender,
    logger: FastifyBaseLogger
  ) {
    this.logger = logger.child({ component: 'Reconciler' });
  }

  async run(): Promise<void> {
    await this.resetOrphanClaims();
    await this.resolveInflight();
  }

  // Locks claimed ('minting') but with no broadcast row: no tx was ever sent, so it is safe to
  // return them to the queue.
  private async resetOrphanClaims(): Promise<void> {
    const result = await sql<{ id: string }>`
      UPDATE locks SET status = 'pending', updated_at = now()
      WHERE status = 'minting'
        AND NOT EXISTS (SELECT 1 FROM mint_broadcasts WHERE mint_broadcasts.lock_id = locks.id)
      RETURNING id
    `.execute(this.db);
    if (result.rows.length > 0) {
      this.logger.warn({ count: result.rows.length }, 'reset orphaned claims back to pending');
    }
  }

  // For each still-in-flight lock, check whether any of its submitted deliver() txs already landed.
  // If so, mark terminal now. Otherwise re-attach a receipt waiter to the latest attempt (same
  // nonce) and let the stuck-tx monitor bump it if needed.
  private async resolveInflight(): Promise<void> {
    const result = await sql<InflightBroadcast>`
      SELECT
        mint_broadcasts.id   AS broadcast_id,
        mint_broadcasts.lock_id,
        mint_broadcasts.hash,
        mint_broadcasts.nonce
      FROM mint_broadcasts
      INNER JOIN locks ON locks.id = mint_broadcasts.lock_id
      WHERE mint_broadcasts.status = 'submitted'
        AND locks.status = 'minting'
      ORDER BY mint_broadcasts.lock_id, mint_broadcasts.broadcasted_at ASC
    `.execute(this.db);

    const byLock = Map.groupBy(result.rows, (r) => r.lock_id);
    for (const rows of byLock.values()) {
      await this.resolveLock(rows);
    }
  }

  private async resolveLock(rows: InflightBroadcast[]): Promise<void> {
    for (const row of rows) {
      const receipt = await this.tryGetReceipt(row.hash as Hex);
      if (receipt) {
        await this.mintSender.markTerminal({ broadcastId: row.broadcast_id, lockId: row.lock_id, receipt });
        this.logger.info({ lockId: row.lock_id, hash: row.hash }, 'reconciled landed deliver tx');
        return;
      }
    }

    // None landed: re-attach a waiter to the most recent attempt (same nonce as the rest).
    const latest = rows[rows.length - 1]!;
    this.mintSender.resumeWaiting({
      broadcastId: latest.broadcast_id,
      lockId: latest.lock_id,
      hash: latest.hash as Hex,
      nonce: latest.nonce
    });
    this.logger.info({ lockId: latest.lock_id, hash: latest.hash }, 'resumed waiting on in-flight deliver tx');
  }

  private async tryGetReceipt(hash: Hex): Promise<TransactionReceipt | null> {
    try {
      return await this.destClient.getTransactionReceipt({ hash });
    } catch {
      return null;
    }
  }
}
