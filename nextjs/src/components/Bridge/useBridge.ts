'use client';

import { useTokenAMetadata } from '@/hooks/useTokenAMetadata';
import { useCallback } from 'react';
import { type Hex, parseUnits } from 'viem';
import type { useApproval } from './useApproval';
import type { useLock } from './useLock';

export type BridgePhase = 'form' | 'approving' | 'locking' | 'waiting' | 'complete' | 'error';

// Which write failed, so the status view can flag the right row and let the user retry in place.
export type FailedStep = 'approving' | 'locking';

export type BridgeActions = {
  begin: (receivedAmount: bigint) => void;
  setStepApproving: () => void;
  setApproveHash: (hash: Hex) => void;
  setStepLocking: () => void;
  setLockHash: (hash: Hex) => void;
  setStepWaiting: () => void;
  fail: (step: FailedStep) => void;
};

// Full decimal only (rejects '', '.', '1.'), so parseUnits never has to be guarded against a throw.
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

type UseBridgeArgs = {
  amount: string;
  approval: ReturnType<typeof useApproval>;
  locking: ReturnType<typeof useLock>;
  actions: BridgeActions;
};

export function useBridge({ amount, approval, locking, actions }: UseBridgeArgs) {
  const { decimals } = useTokenAMetadata();
  const { hasAllowance, approve } = approval;
  const { lock } = locking;

  return useCallback(async () => {
    const parsed = DECIMAL_PATTERN.test(amount) ? parseUnits(amount, decimals ?? 18) : 0n;
    if (parsed <= 0n) {
      return;
    }
    actions.begin(parsed);

    let step: FailedStep = 'approving';
    try {
      if (!(await hasAllowance(parsed))) {
        step = 'approving';
        actions.setStepApproving();
        if (!(await approve(parsed, actions.setApproveHash))) {
          actions.fail('approving');
          return;
        }
      }
      step = 'locking';
      actions.setStepLocking();
      if (!(await lock(parsed, actions.setLockHash))) {
        actions.fail('locking');
        return;
      }
      actions.setStepWaiting();
    } catch {
      // Rejections and reverts already surface through the transaction toasts; keep the user in place to retry.
      actions.fail(step);
    }
  }, [amount, decimals, hasAllowance, approve, lock, actions]);
}
