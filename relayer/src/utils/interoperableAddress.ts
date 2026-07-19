import type { Address, Hex } from 'viem';

// The trailing 20 bytes of an ERC-7930 interoperable address (the EVM address). ERC-7930 is laid out
// `version | chainType | chainRefLen | chainRef | addrLen | address`, so an EVM address is the final
// 20 bytes. Compare the result with viem's isAddressEqual (case-insensitive), not string equality.
//
// NOTE: this assumes a 20-byte EVM address at the tail. It is correct for this EVM<->EVM bridge, but
// would be wrong for a non-EVM chain (e.g. a 32-byte Solana address) — there you must read `addrLen`
// and slice accordingly. Kept EVM-only on purpose given the bridge's scope.
export function evmAddressFromInterop(interop: Hex): Address {
  return `0x${interop.slice(-40)}` as Address;
}
