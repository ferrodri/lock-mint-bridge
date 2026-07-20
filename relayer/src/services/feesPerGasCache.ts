import type { FastifyBaseLogger } from 'fastify';
import type { PublicClient } from 'viem';
import { FEE_REFRESH_MS } from '../config/chains';
import type { FeeEstimate } from '../types';

// In-memory EIP-1559 fee estimate for the destination chain, refreshed on a timer so the hot
// signing path never makes a per-tx fee RPC. A plain timer (rather than a WS newHeads
// subscription) keeps the service dependency-light; staleness is bounded by FEE_REFRESH_MS and
// absorbed by the 1.2x initial cushion plus the replacement bump ladder.
export class FeesPerGasCache {
  private fees: FeeEstimate | null = null;
  private timer: NodeJS.Timeout | null = null;
  private readonly logger: FastifyBaseLogger;

  constructor(
    private readonly client: PublicClient,
    logger: FastifyBaseLogger
  ) {
    this.logger = logger.child({ component: 'FeesPerGasCache' });
  }

  async fetch(): Promise<void> {
    const fees = await this.client.estimateFeesPerGas();
    this.fees = { maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas };
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.refresh();
    }, FEE_REFRESH_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  get(): FeeEstimate {
    if (!this.fees) throw new Error('FeesPerGasCache not populated');
    return this.fees;
  }

  private async refresh(): Promise<void> {
    try {
      await this.fetch();
    } catch (err) {
      this.logger.error({ err }, 'fee refresh failed; serving previous value');
    }
  }
}
