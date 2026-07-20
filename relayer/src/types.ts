// Per-attempt on-chain tx lifecycle (one row per deliver() broadcast).
export type TxStatus = 'submitted' | 'succeeded' | 'failed';

// Business lifecycle of a lock->mint job.
//   pending_verification - frontend submitted the lock tx; awaiting a finalized MessageSent on source
//   pending              - lock verified and finalized; ready to relay
//   minting              - claimed by the processor; a deliver() tx is (being) broadcast
//   minted               - deliver() confirmed successfully on the destination chain
//   failed               - verification failed (no/invalid/reverted lock) or deliver() reverted
export type LockStatus = 'pending_verification' | 'pending' | 'minting' | 'minted' | 'failed';

export interface FeeEstimate {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}
