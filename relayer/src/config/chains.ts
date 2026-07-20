import type { Address } from 'viem';
import { baseSepolia, optimismSepolia, type Chain } from 'viem/chains';

export const SOURCE_CHAIN: Chain = optimismSepolia; // 11155420
export const DEST_CHAIN: Chain = baseSepolia; // 84532

// Deployed bridge contracts the relayer touches (see contracts/broadcast + contracts/README.md).
// sourceGateway/lockBridge: verify the lock on OP Sepolia. destGateway/mintBridge: execute the mint
// on Base Sepolia. The minted tokenB is intentionally omitted — the relayer only calls
// gateway.deliver(); the MintBridge is what mints the token.
export const CONTRACTS = {
  sourceGateway: '0xc7c73674aa1B32c82580f8FA0Ae65325d719C32b',
  lockBridge: '0x645616D46EB1eCebC1AB1c9927192867DE0DC28C',
  destGateway: '0xE3474E4bC25B7f94c43d81Ea383722074cE3277f',
  mintBridge: '0x50d5539282846118B081E3917A9466a4E0e6A0c9'
} as const satisfies Record<string, Address>;

// Initial fee cushion over the cached estimate, then the replacement bump ladder. Both maxFee
// and maxPriorityFee are scaled by the same multiplier; EIP-1559 requires >=10% to replace.
export const INITIAL_FEE_MULTIPLIER = 1.2;
export const FEE_BUMP_LADDER: readonly number[] = [1.5, 1.8, 2.0] as const;

// Mempool floor for a replacement: both maxFeePerGas and maxPriorityFeePerGas must be at least this
// multiple of the PREVIOUS broadcast, or the node rejects it with "replacement transaction
// underpriced" — even if the base fee has dropped and the market-based bump came out lower.
export const MIN_REPLACEMENT_BUMP = 1.1;

// Destination-chain timing (Base Sepolia, ~2s blocks). The stuck monitor wakes every
// tickIntervalMs; a deliver() with no receipt after stuckTimeoutMs is bumped/replaced.
export const DEST_TICK_INTERVAL_MS = 6_000;
export const DEST_STUCK_TIMEOUT_MS = 15_000;

// How often the fee cache refetches estimateFeesPerGas for the destination chain.
export const FEE_REFRESH_MS = 12_000;

// Max rows a single poller tick pulls: the verifier per finality check, the processor per claim.
// Bounds work (and nonce reservations) per tick; a backlog drains over successive ticks.
export const CLAIM_BATCH = 25;

// How the verifier decides a lock is safe to mint against:
//   finalized     - source tx block <= the `finalized` block tag (L1-driven, strongest; ~15-30 min)
//   safe          - source tx block <= the `safe` block tag (batched to L1; ~5-10 min)
//   confirmations - source tx block + FINALITY_CONFIRMATIONS <= the `latest` head (fastest, weakest)
// `finalized` blocks never reorg, so the verifier can trust the block number it recorded at POST time
// without re-fetching the receipt; `confirmations` trails a reorg-prone head and is best-effort.
export const FINALITY_POLICIES = ['finalized', 'safe', 'confirmations'] as const;
export type FinalityPolicy = (typeof FINALITY_POLICIES)[number];
export const FINALITY_POLICY: FinalityPolicy = 'finalized';
// export const FINALITY_POLICY: FinalityPolicy = 'confirmations';

// Only used when FINALITY_POLICY === 'confirmations'.
export const FINALITY_CONFIRMATIONS = 10n;

// Verifier / mint-processor poll cadence.
export const POLL_INTERVAL_MS = 5_000;

// How long a lock can stay unverified (tx never appears / never finalizes) before it is marked
// failed. 60 * 60_000 ms = 1 hour.
export const MAX_VERIFY_AGE_MS = 60 * 60_000;

// Gas limit for the destination deliver() tx.
// TODO: fixed high default; replace with a per-op average or eth_estimateGas (see TODO.md).
export const DEST_GAS_LIMIT = 800_000n;
