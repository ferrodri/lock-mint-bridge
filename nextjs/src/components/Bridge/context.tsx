'use client';

import { useBalancesContext } from '@/contexts/BalancesContext';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { type Hex } from 'viem';
import { useApproval } from './useApproval';
import { type BridgePhase, type FailedStep, useBridge } from './useBridge';
import { useLock } from './useLock';

type BridgeContextValue = {
  phase: BridgePhase;
  amount: string;
  approveHash?: Hex;
  lockHash?: Hex;
  receivedAmount?: bigint;
  failedStep?: FailedStep;
  busy: boolean;
  setAmount: (value: string) => void;
  bridge: () => Promise<void>;
  complete: () => void;
  reset: () => void;
};

const BridgeContext = createContext<BridgeContextValue | null>(null);

export function useBridgeContext() {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error('useBridgeContext must be used within a BridgeProvider');
  }
  return context;
}

export const BridgeProvider = ({ children }: { children: React.ReactNode }) => {
  const approval = useApproval();
  const locking = useLock();
  const { setRefetchBalances } = useBalancesContext();

  const [phase, setPhase] = useState<BridgePhase>('form');
  const [amount, setAmount] = useState('');
  const [approveHash, setApproveHash] = useState<Hex>();
  const [lockHash, setLockHash] = useState<Hex>();
  const [receivedAmount, setReceivedAmount] = useState<bigint>();
  const [failedStep, setFailedStep] = useState<FailedStep>();
  // A tx is in flight (awaiting wallet/confirmation). Drives the step spinner and disables the CTA.
  const [busy, setBusy] = useState(false);

  const begin = useCallback((received: bigint) => {
    setReceivedAmount(received);
    setApproveHash(undefined);
    setLockHash(undefined);
    setFailedStep(undefined);
    setBusy(true);
  }, []);

  const setStepApproving = useCallback(() => setPhase('approving'), []);

  const setStepLocking = useCallback(() => setPhase('locking'), []);

  const setStepWaiting = useCallback(() => {
    setPhase('waiting');
    setBusy(false);
    setRefetchBalances(true);
  }, [setRefetchBalances]);

  // User rejected the signature: stop the spinner but stay on the current step so progress (e.g. a done
  // approval) is preserved and they can retry in place — never bounce back to the form.
  const pause = useCallback(() => setBusy(false), []);
  const fail = useCallback((step: FailedStep) => {
    setFailedStep(step);
    setBusy(false);
    setPhase('error');
  }, []);

  const complete = useCallback(() => {
    setBusy(false);
    setPhase('complete');
  }, []);

  const actions = useMemo(
    () => ({ begin, setStepApproving, setApproveHash, setStepLocking, setLockHash, setStepWaiting, pause, fail }),
    [begin, setStepApproving, setStepLocking, setStepWaiting, pause, fail]
  );

  const bridge = useBridge({ amount, approval, locking, actions });

  const { reset: resetApproval } = approval;
  const { reset: resetLocking } = locking;

  const reset = useCallback(() => {
    setPhase('form');
    setAmount('');
    setApproveHash(undefined);
    setLockHash(undefined);
    setReceivedAmount(undefined);
    setFailedStep(undefined);
    setBusy(false);
    resetApproval();
    resetLocking();
  }, [resetApproval, resetLocking]);

  const value = useMemo(
    () => ({
      phase,
      amount,
      approveHash,
      lockHash,
      receivedAmount,
      failedStep,
      busy,
      setAmount,
      bridge,
      complete,
      reset
    }),
    [phase, amount, approveHash, lockHash, receivedAmount, failedStep, busy, bridge, complete, reset]
  );

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
};
