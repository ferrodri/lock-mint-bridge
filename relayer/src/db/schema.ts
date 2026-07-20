// DDL inlined as a string so the build doesn't need to copy a .sql file into dist/.
// All statements are idempotent so this can run on every boot.
// Take-home convenience; production should run versioned migrations from CI/CD instead.

const DECIMAL_78 = 'DECIMAL(78, 0)';
const ADDRESS_REGEX = `'^0x[0-9a-f]{40}$'`;
const HASH_REGEX = `'^0x[0-9a-f]{64}$'`;

export const SCHEMA_SQL = `
DO $$ BEGIN
  CREATE TYPE tx_status AS ENUM ('submitted', 'succeeded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lock_status AS ENUM ('pending_verification', 'pending', 'minting', 'minted', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One row per lock->mint job. POST decodes the source MessageSent event and stores everything up
-- front; the verifier only waits for the lock to become final before flipping it to 'pending'.
--
-- send_id is the on-chain message id and THE idempotency key: there is no on-chain replay
-- protection, so this UNIQUE is the sole guard against double-mint. One lock tx emits exactly one
-- sendId, so no separate (source_chain_id, hash) uniqueness is needed. Status is polled by send_id.
CREATE TABLE IF NOT EXISTS locks (
  id                   UUID PRIMARY KEY,
  send_id              TEXT NOT NULL UNIQUE CHECK (send_id ~ ${HASH_REGEX}),
  source_chain_id      INTEGER NOT NULL,
  dest_chain_id        INTEGER NOT NULL,
  hash                 TEXT NOT NULL CHECK (hash ~ ${HASH_REGEX}),
  recipient            TEXT NOT NULL CHECK (recipient ~ ${ADDRESS_REGEX}),
  amount               ${DECIMAL_78} NOT NULL,
  payload              BYTEA NOT NULL,
  message_sender       BYTEA NOT NULL,
  -- Source-chain block the lock tx was mined in, captured from the receipt at POST time. The verifier
  -- promotes a lock once this is <= the finality watermark, so it never re-fetches the receipt.
  block_number         BIGINT NOT NULL CHECK (block_number >= 0),
  status               lock_status NOT NULL DEFAULT 'pending_verification',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For DBs created before block_number existed: add it nullable so the DDL stays idempotent. New rows
-- always set it; legacy NULL rows are excluded from the verifier's block_number <= watermark promote.
ALTER TABLE locks ADD COLUMN IF NOT EXISTS block_number BIGINT;

CREATE INDEX IF NOT EXISTS locks_status_verifying_idx
  ON locks (status) WHERE status = 'pending_verification';
CREATE INDEX IF NOT EXISTS locks_status_pending_idx ON locks (status) WHERE status = 'pending';

-- One row per on-chain deliver() attempt (initial + fee-bump replacements). lock_id links each
-- attempt back to its lock.
CREATE TABLE IF NOT EXISTS mint_broadcasts (
  id                       UUID PRIMARY KEY,
  lock_id                  UUID NOT NULL REFERENCES locks(id) ON DELETE CASCADE,
  dest_chain_id            INTEGER NOT NULL,
  nonce                    BIGINT NOT NULL,
  receive_id               TEXT NOT NULL CHECK (receive_id ~ ${HASH_REGEX}),
  bump_multiplier          TEXT NOT NULL,
  max_fee_per_gas          ${DECIMAL_78} NOT NULL,
  max_priority_fee_per_gas ${DECIMAL_78} NOT NULL,
  gas_limit                BIGINT NOT NULL,
  signed_raw               BYTEA NOT NULL,
  hash                     TEXT NOT NULL UNIQUE CHECK (hash ~ ${HASH_REGEX}),
  status                   tx_status NOT NULL DEFAULT 'submitted',
  receipt                  JSONB,
  broadcasted_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mint_broadcasts_dest_status_pending_idx
  ON mint_broadcasts (dest_chain_id, status)
  WHERE status = 'submitted';

CREATE INDEX IF NOT EXISTS mint_broadcasts_lock_broadcasted_at_idx
  ON mint_broadcasts (lock_id, broadcasted_at DESC);
`;
