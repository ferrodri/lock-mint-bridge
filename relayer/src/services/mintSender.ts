import type { FastifyBaseLogger } from 'fastify';
import { sql } from 'kysely';
import { randomUUID } from 'node:crypto';
import {
  encodeFunctionData,
  keccak256,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient
} from 'viem';
import { GATEWAY_ABI } from '../abis/gateway';
import { CONTRACTS, DEST_CHAIN, INITIAL_FEE_MULTIPLIER } from '../config/chains';
import type { AppDb } from '../db/kysely';
import type { FeeEstimate } from '../types';
import { bumpFees, replacementFees } from '../utils/gas-fees';
import type { FeesPerGasCache } from './feesPerGasCache';
import { NonceTracker } from './nonceTracker';

// A single lock->mint job: everything needed to build and (re)sign the destination deliver() tx.
export interface DeliverJob {
  lockId: string;
  receiveId: Hex; // = locks.send_id
  messageSender: Hex; // interop `sender` bytes taken verbatim from the source MessageSent event
  payload: Hex;
  gasLimit: bigint;
}

interface SignedTx {
  signedRaw: Hex;
  hash: Hex;
  fees: FeeEstimate;
}

// Owns the destination-chain send pipeline for the single relayer EOA. There is exactly one
// MintSender for the whole process, so its serial queue is the sole reserver of nonces — the
// invariant NonceTracker relies on. Only reserve+sign run inside the queue; persist/broadcast/
// wait run detached so the next job can grab the next nonce immediately.
export class MintSender {
  private queue: Promise<void> = Promise.resolve();
  private readonly logger: FastifyBaseLogger;
  public readonly nonceTracker: NonceTracker;

  constructor(
    private readonly db: AppDb,
    private readonly publicClient: PublicClient,
    private readonly walletClient: WalletClient,
    private readonly feesPerGasCache: FeesPerGasCache,
    sender: Address,
    logger: FastifyBaseLogger
  ) {
    this.nonceTracker = new NonceTracker(publicClient, sender);
    this.logger = logger.child({ component: 'MintSender' });
  }

  enqueueNew(job: DeliverJob): void {
    this.queue = this.queue
      .then(async () => {
        const nonce = await this.nonceTracker.reserve();
        const signed = await this.signOrReset({
          job,
          nonce,
          bumpMultiplier: INITIAL_FEE_MULTIPLIER,
          isReplacement: false
        });
        if (!signed) return;
        void this.persistAndBroadcast({ job, nonce, bumpMultiplier: INITIAL_FEE_MULTIPLIER, signed });
      })
      .catch((err) => {
        this.logger.error({ err, lockId: job.lockId }, 'unexpected error in mint queue (new)');
      });
  }

  enqueueReplace({
    job,
    sameNonce,
    nextTier,
    previousFees
  }: {
    job: DeliverJob;
    sameNonce: bigint;
    nextTier: number;
    previousFees: FeeEstimate;
  }): void {
    this.queue = this.queue
      .then(async () => {
        if (nextTier > 2.0) {
          this.logger.error(
            { lockId: job.lockId, nonce: sameNonce.toString() },
            'fee-bump ladder exhausted; giving up'
          );
          return;
        }
        const signed = await this.signOrReset({
          job,
          nonce: sameNonce,
          bumpMultiplier: nextTier,
          isReplacement: true,
          previousFees
        });
        if (!signed) return;
        void this.persistAndBroadcast({ job, nonce: sameNonce, bumpMultiplier: nextTier, signed });
      })
      .catch((err) => {
        this.logger.error(
          { err, lockId: job.lockId, sameNonce: sameNonce.toString(), nextTier },
          'unexpected error in mint queue (replace)'
        );
      });
  }

  // Re-attach a receipt waiter to an already-broadcast attempt (used by the boot reconciler for
  // deliver() txs that were in flight when the process died). Nonce-safe: no new tx is created.
  resumeWaiting({
    broadcastId,
    lockId,
    hash,
    nonce
  }: {
    broadcastId: string;
    lockId: string;
    hash: Hex;
    nonce: bigint;
  }): void {
    void this.waitAndMarkTerminal({ broadcastId, lockId, hash, nonce });
  }

  private buildDeliverData(job: DeliverJob): Hex {
    return encodeFunctionData({
      abi: GATEWAY_ABI,
      functionName: 'deliver',
      args: [CONTRACTS.mintBridge, job.receiveId, job.messageSender, job.payload]
    });
  }

  private async signOrReset({
    job,
    nonce,
    bumpMultiplier,
    isReplacement,
    previousFees
  }: {
    job: DeliverJob;
    nonce: bigint;
    bumpMultiplier: number;
    isReplacement: boolean;
    previousFees?: FeeEstimate;
  }): Promise<SignedTx | null> {
    // Replacements must clear the previous broadcast by >=10% even if the base fee has dropped;
    // new sends just cushion the current estimate.
    const fees =
      isReplacement && previousFees
        ? replacementFees(this.feesPerGasCache.get(), bumpMultiplier, previousFees)
        : bumpFees(this.feesPerGasCache.get(), bumpMultiplier);
    try {
      const signedRaw = await this.walletClient.signTransaction({
        account: this.walletClient.account!,
        chain: DEST_CHAIN,
        to: CONTRACTS.destGateway,
        value: 0n,
        data: this.buildDeliverData(job),
        gas: job.gasLimit,
        nonce: Number(nonce),
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        type: 'eip1559'
      });
      return { signedRaw, hash: keccak256(signedRaw), fees };
    } catch (err) {
      if (!isReplacement) this.nonceTracker.reset(nonce);
      this.logger.error({ err, lockId: job.lockId, nonce: nonce.toString() }, 'pre-broadcast sign failure');
      return null;
    }
  }

  // DB row first, then broadcast: never leave an on-chain tx without its broadcast row.
  private async persistAndBroadcast({
    job,
    nonce,
    bumpMultiplier,
    signed
  }: {
    job: DeliverJob;
    nonce: bigint;
    bumpMultiplier: number;
    signed: SignedTx;
  }): Promise<void> {
    const broadcastId = randomUUID();
    try {
      await this.db
        .insertInto('mint_broadcasts')
        .values({
          id: broadcastId,
          lock_id: job.lockId,
          dest_chain_id: DEST_CHAIN.id,
          nonce,
          receive_id: job.receiveId,
          bump_multiplier: bumpMultiplier.toFixed(2),
          max_fee_per_gas: signed.fees.maxFeePerGas,
          max_priority_fee_per_gas: signed.fees.maxPriorityFeePerGas,
          gas_limit: job.gasLimit,
          signed_raw: Buffer.from(signed.signedRaw.slice(2), 'hex'),
          hash: signed.hash,
          status: 'submitted'
        })
        .execute();
    } catch (err) {
      this.logger.error(
        { err, lockId: job.lockId, nonce: nonce.toString(), hash: signed.hash },
        'mint_broadcasts INSERT failed; nonce slot leaked (no row, no recovery)'
      );
      return;
    }

    try {
      await this.publicClient.request({ method: 'eth_sendRawTransaction', params: [signed.signedRaw] });
    } catch (err) {
      this.logger.error(
        { err, lockId: job.lockId, hash: signed.hash, nonce: nonce.toString() },
        'eth_sendRawTransaction failed; monitor will bump via stuck-tx path'
      );
      return;
    }

    await this.waitAndMarkTerminal({ broadcastId, lockId: job.lockId, hash: signed.hash, nonce });
  }

  private async waitAndMarkTerminal({
    broadcastId,
    lockId,
    hash,
    nonce
  }: {
    broadcastId: string;
    lockId: string;
    hash: Hex;
    nonce: bigint;
  }): Promise<void> {
    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      await this.markTerminal({ broadcastId, lockId, receipt });
    } catch (err) {
      this.logger.error(
        { err, broadcastId, lockId, hash, nonce: nonce.toString() },
        'waitForTransactionReceipt did not resolve; row left as submitted'
      );
    }
  }

  // Records the terminal outcome for a broadcast and, atomically, the lock. Since all replacements
  // share a nonce, only one attempt is ever mined, so this transitions the lock exactly once
  // (guarded by `status = 'minting'`).
  async markTerminal({
    broadcastId,
    lockId,
    receipt
  }: {
    broadcastId: string;
    lockId: string;
    receipt: TransactionReceipt;
  }): Promise<void> {
    const broadcastStatus = receipt.status === 'success' ? 'succeeded' : 'failed';
    const lockStatus = receipt.status === 'success' ? 'minted' : 'failed';
    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('mint_broadcasts')
        .set({ status: broadcastStatus, receipt: receipt as unknown as Record<string, unknown> })
        .where('id', '=', broadcastId)
        .execute();
      await trx
        .updateTable('locks')
        .set({ status: lockStatus, updated_at: sql`now()` })
        .where('id', '=', lockId)
        .where('status', '=', 'minting')
        .execute();
    });
  }
}
