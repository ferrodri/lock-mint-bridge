'use client';

import { Loader2 } from 'lucide-react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { optimismSepolia } from 'wagmi/chains';

/**
 * Self-updating toast body: shows the action title with a spinner while the tx is
 * pending, then swaps the spinner for a block-explorer link once it confirms.
 */
export const ToastTransaction = ({ hash, title }: { hash?: `0x${string}`; title?: string }) => {
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{title ?? 'Transaction'}</span>
      {isSuccess ? (
        <a
          href={`${optimismSepolia.blockExplorers.default.url}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="text-primary text-sm underline underline-offset-2 hover:opacity-80"
        >
          View transaction
        </a>
      ) : (
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      )}
    </div>
  );
};
