'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useBridgeContext } from './context';

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL ?? 'http://localhost:3001';
const POLL_INTERVAL_MS = 3_000;

// Soft hint for the UI countdown only, not a real ETA. OP Sepolia has no fixed block count to
// `finalized`: finality is inherited from L1 (Sepolia). L2 blocks are 2s, but `finalized` tracks
// L1 blocks older than 2 epochs (64 slots x 12s = 12.8 min), plus a ~5-10 min batch-submission lag,
// so the real wait is ~13-30 min. The true completion signal is the relayer status below.
export const DESTINATION_HINT_MS = 30 * 60_000;

type LockStatus = 'pending_verification' | 'pending' | 'minting' | 'minted' | 'failed';
type LockResponse = { status: LockStatus | 'submitting' };

// Owns the destination leg: submits the lock tx hash to the relayer, then polls for its status and
// drives the flow to complete once the mint lands. A 404 means the relayer has not recorded the
// submission yet, so we keep polling.
export function useRelay() {
  const { phase, lockHash, sendId, complete } = useBridgeContext();
  const enabled = phase === 'waiting' && !!lockHash && !!sendId;

  const { mutate: submit } = useMutation({
    mutationFn: async ({ hash, sendId }: { hash: string; sendId: string }) => {
      const res = await fetch(`${RELAYER_URL}/locks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': sendId },
        body: JSON.stringify({ hash })
      });
      // The relayer's RPC may not see the just-mined lock for a moment (404); retry that case.
      if (res.status === 404) {
        throw new Error('retriable');
      }
      if (!res.ok) {
        throw new Error(`relayer responded ${res.status}`);
      }
    },
    retry: (failureCount, error) => error.message === 'retriable' && failureCount < 15,
    retryDelay: 2_000
  });

  // Idempotent server-side (deduped on sendId), so a repeat submit is harmless.
  useEffect(() => {
    if (enabled && lockHash && sendId) {
      submit({ hash: lockHash, sendId });
    }
  }, [enabled, lockHash, sendId, submit]);

  const { data } = useQuery<LockResponse>({
    queryKey: ['relayer-lock', sendId],
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
    queryFn: async () => {
      const res = await fetch(`${RELAYER_URL}/locks/${sendId}`);
      if (res.status === 404) {
        return { status: 'submitting' };
      }
      if (!res.ok) {
        throw new Error(`relayer responded ${res.status}`);
      }
      return (await res.json()) as { status: LockStatus };
    }
  });

  useEffect(() => {
    if (phase !== 'waiting' || !data) {
      return;
    }
    if (data.status === 'minted') {
      complete();
    }
  }, [phase, data, complete]);
}
