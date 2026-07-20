import { MIN_REPLACEMENT_BUMP } from '../config/chains';
import type { FeeEstimate } from '../types';

// Apply a bump ladder tier on top of a base fee estimate. The same multiplier is applied to both
// maxFeePerGas and maxPriorityFeePerGas (EIP-1559 requires both >=10% higher to replace). Integer
// math (scale by 100) avoids float drift on bigint.
export function bumpFees(base: FeeEstimate, multiplier: number): FeeEstimate {
  const num = BigInt(Math.round(multiplier * 100));
  return {
    maxFeePerGas: (base.maxFeePerGas * num) / 100n,
    maxPriorityFeePerGas: (base.maxPriorityFeePerGas * num) / 100n
  };
}

// Fees for a same-nonce replacement. Two constraints must both hold, per field:
//   1. competitive with the market  -> cached estimate x ladder tier
//   2. accepted by the mempool       -> previous broadcast x MIN_REPLACEMENT_BUMP (>=10% bump)
// If the base fee dropped materially since the original broadcast, (1) can fall BELOW the previous
// broadcast and trigger "replacement transaction underpriced". Taking the componentwise max of the
// two guarantees the replacement is both current and >=110% of the tx it replaces.
export function replacementFees(cached: FeeEstimate, tierMultiplier: number, previous: FeeEstimate): FeeEstimate {
  const market = bumpFees(cached, tierMultiplier);
  const floor = bumpFees(previous, MIN_REPLACEMENT_BUMP);
  return {
    maxFeePerGas: market.maxFeePerGas > floor.maxFeePerGas ? market.maxFeePerGas : floor.maxFeePerGas,
    maxPriorityFeePerGas:
      market.maxPriorityFeePerGas > floor.maxPriorityFeePerGas
        ? market.maxPriorityFeePerGas
        : floor.maxPriorityFeePerGas
  };
}
