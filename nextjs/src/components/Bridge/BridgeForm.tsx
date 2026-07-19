'use client';

import { BaseLogo, OptimismLogo } from '@/components/ui/chain-logos';
import { TokenAvatar } from '@/components/TokenAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBalanceOfTokenA } from '@/hooks/useBalanceOfTokenA';
import { useGuardedAction } from '@/hooks/useGuardedAction';
import { useTokenAMetadata } from '@/hooks/useTokenAMetadata';
import { useTokenBMetadata } from '@/hooks/useTokenBMetadata';
import { cn, formatBalance } from '@/lib/utils';
import { ArrowDown } from 'lucide-react';
import { formatUnits, parseUnits } from 'viem';
import { useBridgeContext } from './context';

export const BridgeForm = () => {
  const { amount, setAmount, bridge } = useBridgeContext();
  const balance = useBalanceOfTokenA();
  const { symbol, decimals } = useTokenAMetadata();
  const { symbol: symbolB } = useTokenBMetadata();

  const cta = useGuardedAction(() => bridge(), 'Bridge');
  const symbolA = symbol ?? '—';
  const tokenDecimals = decimals ?? 18;

  const parsed = /^\d+(\.\d+)?$/.test(amount) ? parseUnits(amount, tokenDecimals) : 0n;
  const insufficientBalance = cta.ready && parsed > 0n && (typeof balance !== 'bigint' || parsed > balance);
  const disabled = cta.ready && (parsed <= 0n || insufficientBalance);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^\d*\.?\d*$/.test(e.target.value)) {
      setAmount(e.target.value);
    }
  };

  const handleMax = () => {
    if (typeof balance === 'bigint') {
      setAmount(formatUnits(balance, tokenDecimals));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">You send</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground tabular-nums">
              {formatBalance(balance, tokenDecimals)} {symbolA}
            </span>
            <button
              type="button"
              onClick={handleMax}
              className="text-primary hover:bg-primary/10 rounded-md px-2 py-1 text-xs font-semibold uppercase transition-colors"
            >
              Max
            </button>
          </div>
        </div>
        <div
          className={cn(
            'bg-secondary/40 flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors focus-within:border-ring',
            insufficientBalance ? 'border-destructive' : 'border-border'
          )}
        >
          <div className="flex items-center gap-2">
            <TokenAvatar symbol={symbolA} chainLogo={<OptimismLogo className="size-4" />} />
            <span className="text-sm font-semibold">{symbolA}</span>
          </div>
          <Input
            value={amount}
            onChange={handleAmountChange}
            inputMode="decimal"
            placeholder="0.00"
            className="border-0 bg-transparent text-right text-lg font-semibold focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="flex justify-center">
        <div className="bg-secondary/60 border-border flex size-8 items-center justify-center rounded-lg border">
          <ArrowDown size={14} className="text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">You receive</span>
        <div className="bg-secondary/40 border-border flex items-center justify-between rounded-xl border px-3 py-3">
          <div className="flex items-center gap-2">
            <TokenAvatar symbol={symbolB ?? '—'} chainLogo={<BaseLogo className="size-4" />} />
            <span className="text-sm font-semibold">{symbolB ?? '—'}</span>
          </div>
          <span className="text-muted-foreground text-lg font-semibold tabular-nums">{amount || '0.00'}</span>
        </div>
      </div>

      <Button
        type="button"
        onClick={cta.onClick}
        disabled={disabled}
        className="mt-1 h-auto w-full rounded-full py-3 text-sm font-semibold"
      >
        {cta.ready && insufficientBalance ? `Insufficient ${symbolA}` : cta.label}
      </Button>
    </div>
  );
};
