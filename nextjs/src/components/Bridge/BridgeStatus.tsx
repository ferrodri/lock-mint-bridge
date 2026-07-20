'use client';

import { Button } from '@/components/ui/button';
import { useGuardedAction } from '@/hooks/useGuardedAction';
import { useTokenBMetadata } from '@/hooks/useTokenBMetadata';
import { cn, formatBalance, formatCountdown } from '@/lib/utils';
import { Check, Loader2, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { optimismSepolia } from 'wagmi/chains';
import { useBridgeContext } from './context';
import { StatusRow } from './StatusRow';
import { DESTINATION_HINT_MS, useRelay } from './useRelay';

const HEADLINE: Record<string, string> = {
  approving: 'Approving token',
  locking: 'Locking on OP Sepolia',
  waiting: 'Waiting for destination chain',
  complete: 'Bridge successful',
  error: 'Bridge failed'
};

export const BridgeStatus = () => {
  const { phase, approveHash, lockHash, receivedAmount, failedStep, busy, bridge, reset } = useBridgeContext();
  const { symbol, decimals } = useTokenBMetadata();
  const retryLabel =
    phase === 'approving' || failedStep === 'approving'
      ? 'Retry approve'
      : phase === 'locking' || failedStep === 'locking'
        ? 'Retry lock'
        : 'Retry';
  const cta = useGuardedAction(() => bridge(), retryLabel);
  useRelay();

  const [secondsLeft, setSecondsLeft] = useState(Math.round(DESTINATION_HINT_MS / 1000));

  useEffect(() => {
    if (phase !== 'waiting') {
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const explorer = optimismSepolia.blockExplorers.default.url;
  const isError = phase === 'error';
  const isStep = phase === 'approving' || phase === 'locking';
  // Rejected/dropped mid-step: no tx in flight, but we hold the step so progress is kept and they can retry.
  const paused = isStep && !busy;
  const approveFailed = isError && failedStep === 'approving';
  const lockFailed = isError && failedStep === 'locking';
  // A lock failure implies approval already went through.
  const approveConfirmed = phase === 'locking' || phase === 'waiting' || phase === 'complete' || lockFailed;
  const lockConfirmed = phase === 'waiting' || phase === 'complete';
  const minted = phase === 'complete';
  // Approval is skipped when the allowance already covers the amount, so only show the row when it runs.
  const approvalUsed = phase === 'approving' || approveHash !== undefined || approveFailed;
  const approveUrl = approveHash ? `${explorer}/tx/${approveHash}` : undefined;
  const lockUrl = lockHash ? `${explorer}/tx/${lockHash}` : undefined;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-full',
            minted && 'bg-primary/15 text-primary',
            isError && 'bg-destructive/15 text-destructive',
            !minted && !isError && 'bg-secondary/60 text-muted-foreground'
          )}
        >
          {minted ? (
            <Check size={30} />
          ) : isError ? (
            <X size={30} />
          ) : paused ? (
            <RotateCcw size={28} />
          ) : (
            <Loader2 size={30} className="animate-spin" />
          )}
        </div>
        <span className="text-lg font-bold">{paused ? 'Resume your bridge' : HEADLINE[phase]}</span>
        {phase === 'waiting' && (
          <span className="text-muted-foreground text-sm tabular-nums">{formatCountdown(secondsLeft)}</span>
        )}
      </div>

      <div className="flex w-full flex-col gap-2">
        {approvalUsed && (
          <StatusRow done={approveConfirmed} pending={phase === 'approving' && busy} failed={approveFailed} href={approveUrl}>
            {approveFailed ? 'Approval failed' : 'Approve transaction confirmed'}
          </StatusRow>
        )}
        <StatusRow done={lockConfirmed} pending={phase === 'locking' && busy} failed={lockFailed} href={lockUrl}>
          {lockFailed ? 'Lock failed' : 'Lock transaction confirmed'}
        </StatusRow>
        <StatusRow done={minted} pending={phase === 'waiting'}>
          Minted on Base Sepolia
        </StatusRow>
      </div>

      {minted && receivedAmount !== undefined && (
        <div className="bg-secondary/40 border-border flex w-full flex-col gap-1 rounded-xl border p-4">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Received</span>
          <span className="text-2xl font-bold tabular-nums">
            {formatBalance(receivedAmount, decimals)} <span className="text-base font-medium">{symbol ?? '—'}</span>
          </span>
        </div>
      )}

      {isStep && (
        <Button
          type="button"
          onClick={cta.onClick}
          disabled={busy}
          className="h-auto w-full rounded-full py-3 text-sm font-semibold"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : cta.label}
        </Button>
      )}

      {minted && (
        <Button type="button" onClick={reset} className="h-auto w-full rounded-full py-3 text-sm font-semibold">
          Done
        </Button>
      )}

      {isError && (
        <Button type="button" onClick={cta.onClick} className="h-auto w-full rounded-full py-3 text-sm font-semibold">
          {cta.label}
        </Button>
      )}
    </div>
  );
};
