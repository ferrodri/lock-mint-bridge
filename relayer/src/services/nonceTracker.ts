import type { Address, PublicClient } from 'viem';

// Pending-nonce counter for the single relayer EOA on the destination chain.
// - reserve(): mutex-serialized, returns this.next++ and bootstraps from
//   getTransactionCount(pending) on first use. Wrapped in try/finally so a thrown
//   getTransactionCount still releases the mutex; on throw this.next stays null so the next
//   reserve() retries the bootstrap.
// - reset(n): release a reserved-but-not-broadcast nonce so the next reserve() reuses it.
//
// Correctness depends on the "exactly one outstanding nonce at a time" invariant, enforced by
// MintSender's serial queue. The mutex here only protects reserve()'s read-modify-write.
export class NonceTracker {
  private next: bigint | null = null;
  private lock: Promise<void> = Promise.resolve();

  constructor(
    private readonly client: PublicClient,
    private readonly address: Address
  ) {}

  async reserve(): Promise<bigint> {
    const prev = this.lock;
    let release!: () => void;
    this.lock = new Promise<void>((r) => {
      release = r;
    });
    await prev;
    try {
      if (this.next === null) {
        const n = await this.client.getTransactionCount({ address: this.address, blockTag: 'pending' });
        this.next = BigInt(n);
      }
      const out = this.next;
      this.next = this.next + 1n;
      return out;
    } finally {
      release();
    }
  }

  reset(n: bigint): void {
    this.next = n;
  }
}
