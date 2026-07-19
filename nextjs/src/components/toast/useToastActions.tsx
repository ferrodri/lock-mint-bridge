'use client';

import { useCallback, useRef } from 'react';
import { toast, type Id } from 'react-toastify';
import { ToastTransaction } from './ToastTransaction';

/**
 * Drives a single persistent transaction toast: open it (no auto-close) when the
 * tx is submitted, then let it auto-close once confirmed. ToastTransaction renders
 * the pending/success body off the tx hash itself.
 */
export const useToastActions = () => {
  const toastId = useRef<Id | null>(null);

  const notifyToast = useCallback((hash: `0x${string}`, title?: string) => {
    toastId.current = toast(<ToastTransaction hash={hash} title={title} />, {
      autoClose: false,
      closeOnClick: false
    });
  }, []);

  const updateToast = useCallback(() => {
    if (toastId.current !== null) {
      toast.update(toastId.current, { autoClose: 4000 });
    }
  }, []);

  const dismissToast = useCallback(() => {
    if (toastId.current !== null) {
      toast.dismiss(toastId.current);
    }
  }, []);

  return { notifyToast, updateToast, dismissToast };
};
