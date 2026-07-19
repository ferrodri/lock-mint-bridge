'use client';

import { useToastActions } from '@/components/toast/useToastActions';
import { toErrorMessage } from '@/lib/utils';
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

  useEffect(() => {
    if (hash && hash !== notifiedHash.current) {
      notifyToast(hash, title);
      notifiedHash.current = hash;
    }
  }, [hash, notifyToast, title]);

  useEffect(() => {
    if (receipt.data?.status === 'success') {
      updateToast();
      onConfirmed?.();
    }
  }, [receipt.data, updateToast, onConfirmed]);

  // A reverted tx still resolves the receipt (it is not an error), so a status check
  // is the only reliable way to catch it — react-query's error/failureReason won't fire.
  useEffect(() => {
    if (receipt.data?.status === 'reverted') {
      dismissToast();
      toast('Transaction reverted on-chain.');
    }
  }, [receipt.data, dismissToast]);

  useEffect(() => {
    if (error) {
      toast(toErrorMessage(error));
    }
  }, [error]);

  useEffect(() => {
    if (receipt.error) {
      dismissToast();
      toast(toErrorMessage(receipt.error));
    }
  }, [receipt.error, dismissToast]);

  return { isConfirming: receipt.isLoading, isSuccess: receipt.data?.status === 'success' };
};
