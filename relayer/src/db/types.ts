import type { Generated, JSONColumnType } from 'kysely';
import type { LockStatus, TxStatus } from '../types';

type JsonObject = Record<string, unknown>;
type JsonbColumn = JSONColumnType<JsonObject, JsonObject, JsonObject>;

export interface LocksTable {
  id: string;
  // The on-chain message id, and THE idempotency key: UNIQUE, so a single lock can only ever be
  // minted once. Decoded from the MessageSent event at POST time, so it is always present.
  send_id: string;
  source_chain_id: number;
  dest_chain_id: number;
  hash: string;
  recipient: string;
  amount: bigint;
  payload: Buffer;
  message_sender: Buffer;
  block_number: bigint;
  status: LockStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface MintBroadcastsTable {
  id: string;
  lock_id: string;
  dest_chain_id: number;
  nonce: bigint;
  receive_id: string;
  bump_multiplier: string;
  max_fee_per_gas: bigint;
  max_priority_fee_per_gas: bigint;
  gas_limit: bigint;
  signed_raw: Buffer;
  hash: string;
  status: TxStatus;
  receipt: JsonbColumn | null;
  broadcasted_at: Generated<Date>;
}

export interface Database {
  locks: LocksTable;
  mint_broadcasts: MintBroadcastsTable;
}
