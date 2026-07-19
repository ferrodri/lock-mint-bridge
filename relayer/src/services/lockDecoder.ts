import {
  decodeAbiParameters,
  decodeEventLog,
  getAddress,
  isAddressEqual,
  slice,
  type Hex,
  type PublicClient
} from 'viem';
import { GATEWAY_ABI } from '../abis/gateway';
import { CONTRACTS } from '../config/chains';
import { evmAddressFromInterop } from '../utils/interoperableAddress';

// BridgeFungible payload layout: abi.encode(bytes sourceUserInterop, bytes recipient, uint256 amount).
const PAYLOAD_PARAMS = [{ type: 'bytes' }, { type: 'bytes' }, { type: 'uint256' }] as const;

// Everything about a lock that we persist, all derived from the source-chain MessageSent event.
export interface DecodedLock {
  sendId: Hex;
  recipient: string;
  amount: bigint;
  payload: Hex;
  messageSender: Hex;
}

export type DecodeResult =
  | { status: 'not_found' } // tx not visible to our RPC yet (retriable)
  | { status: 'invalid'; reason: string } // reverted or not a lock for this bridge (terminal)
  | { status: 'ok'; lock: DecodedLock };

// The relayer is the security boundary: a frontend POST is untrusted, so we pull the lock tx from
// the source chain and confirm it emitted a MessageSent from our gateway for our bridge before we
// ever record a send_id. Returns the decoded lock, or why it can't be trusted.
export async function decodeLockReceipt(client: PublicClient, hash: Hex): Promise<DecodeResult> {
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash });
  } catch {
    return { status: 'not_found' };
  }

  if (receipt.status !== 'success') return { status: 'invalid', reason: 'lock tx reverted' };

  for (const log of receipt.logs) {
    if (!isAddressEqual(log.address, CONTRACTS.sourceGateway)) continue;

    let args: { sendId?: Hex; sender?: Hex; recipient?: Hex; payload?: Hex };
    try {
      const event = decodeEventLog({ abi: GATEWAY_ABI, data: log.data, topics: log.topics });
      if (event.eventName !== 'MessageSent') continue;
      args = event.args as typeof args;
    } catch {
      continue;
    }

    const { sendId, sender, recipient, payload } = args;
    if (!sendId || !sender || !recipient || !payload) continue;

    // Defense in depth: only relay messages from our LockBridge addressed to our MintBridge.
    if (
      !isAddressEqual(evmAddressFromInterop(sender), CONTRACTS.lockBridge) ||
      !isAddressEqual(evmAddressFromInterop(recipient), CONTRACTS.mintBridge)
    )
      continue;

    let toBinary: Hex;
    let amount: bigint;
    try {
      [, toBinary, amount] = decodeAbiParameters(PAYLOAD_PARAMS, payload) as [Hex, Hex, bigint];
    } catch {
      continue;
    }

    return {
      status: 'ok',
      lock: {
        sendId,
        // Payload recipient is consumed on-chain as address(bytes20(toBinary)) — the LEADING 20 bytes
        // (Solidity bytes20 is left-aligned), unlike the ERC-7930 sender/recipient above whose EVM
        // address is the TRAILING 20 bytes (see evmAddressFromInterop).
        recipient: getAddress(slice(toBinary, 0, 20)).toLowerCase(),
        amount,
        payload,
        messageSender: sender
      }
    };
  }

  return { status: 'invalid', reason: 'no valid MessageSent for this bridge in lock tx' };
}
