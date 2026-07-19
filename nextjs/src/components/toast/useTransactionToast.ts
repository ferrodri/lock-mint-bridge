'use client';

import { useToastActions } from '@/components/toast/useToastActions';
import { isUserRejection, toErrorMessage } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useWaitForTransactionReceipt } from 'wagmi';

type Hash = `0x${string}` | undefined;

export const useTransactionToast = ({
  hash,
  title,
  error,
  onConfirmed
}: {
  hash: Hash;
  title?: string;
  error?: Error | null;
  onConfirmed?: () => void;
}) => {
  const notifiedHash = useRef<Hash>(undefined);
  const receipt = useWaitForTransactionReceipt({ hash });
  const { notifyToast, updateToast, dismissToast } = useToastActions();

  // Open the pending toast once, as soon as the tx is submitted and has a hash.
  useEffect(() => {
    if (hash && hash !== notifiedHash.current) {
      notifyToast(hash, title);
      notifiedHash.current = hash;
    }
  }, [hash, notifyToast, title]);

  // Tx confirmed: let the toast auto-close and run the caller's success callback.
  useEffect(() => {
    if (receipt.data?.status === 'success') {
      updateToast();
      onConfirmed?.();
    }
  }, [receipt.data, updateToast, onConfirmed]);

  // Tx mined but reverted on-chain: a reverted receipt still resolves (not an error),
  // so a status check is the only reliable way to catch it — error/failureReason won't fire.
  useEffect(() => {
    if (receipt.data?.status === 'reverted') {
      dismissToast();
      toast('Transaction reverted on-chain.');
    }
  }, [receipt.data, dismissToast]);

  // Write failed before landing (RPC error, etc.). A user rejection is a cancel, not a failure — stay silent.
  useEffect(() => {
    if (error && !isUserRejection(error)) {
      toast(toErrorMessage(error));
    }
  }, [error]);

  // Receipt lookup failed (RPC/timeout): drop the pending toast and surface the error.
  useEffect(() => {
    if (receipt.error) {
      dismissToast();
      toast(toErrorMessage(receipt.error));
    }
  }, [receipt.error, dismissToast]);

  return { isConfirming: receipt.isLoading, isSuccess: receipt.data?.status === 'success' };
};
