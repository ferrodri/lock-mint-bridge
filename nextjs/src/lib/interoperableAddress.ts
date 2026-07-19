import { type Address, type Hex, concatHex, numberToHex } from 'viem';

/**
 * ERC-7930 InteroperableAddress (v1) for an EVM recipient, as expected by
 * LockBridge.crosschainTransfer. Layout: version(0x0001) | chainType(0x0000 = eip155) |
 * chainRefLen(1 byte) | chainRef | addrLen(0x14 = 20) | address.
 */
export function encodeEvmInteroperableAddress(chainId: number, address: Address): Hex {
  // The chain reference is the minimal big-endian, byte-aligned encoding of the chain id.
  const raw = numberToHex(chainId).slice(2);
  const chainRefHex = raw.length % 2 === 0 ? raw : `0${raw}`;
  const chainRef = `0x${chainRefHex}` as Hex;
  const chainRefLen = numberToHex(chainRefHex.length / 2, { size: 1 });
  return concatHex(['0x0001', '0x0000', chainRefLen, chainRef, '0x14', address]);
}
