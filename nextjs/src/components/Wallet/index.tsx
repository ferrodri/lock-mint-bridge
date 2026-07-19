'use client';

import { BaseLogo, OptimismLogo } from '@/components/ui/chain-logos';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBalanceOfTokenA } from '@/hooks/useBalanceOfTokenA';
import { useBalanceOfTokenB } from '@/hooks/useBalanceOfTokenB';
import { useTokenAContract } from '@/hooks/useTokenAContract';
import { useTokenAMetadata } from '@/hooks/useTokenAMetadata';
import { useTokenBMetadata } from '@/hooks/useTokenBMetadata';
import { formatBalance, shortAddress } from '@/lib/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Copy, PlusCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAccount, useWatchAsset } from 'wagmi';
import { TokenBalanceRow } from '@/components/TokenBalanceRow';
import { Disconnect } from './Disconnect';
import { SwitchNetwork } from './SwitchNetwork';

export const Wallet = () => {
  const { address } = useAccount();
  const { watchAsset } = useWatchAsset();
  const token = useTokenAContract();
  const tokenA = useBalanceOfTokenA();
  const { symbol, decimals } = useTokenAMetadata();
  const tokenB = useBalanceOfTokenB();
  const { symbol: symbolB, decimals: decimalsB } = useTokenBMetadata();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return (
            <Button
              type="button"
              onClick={openConnectModal}
              className="h-auto rounded-full px-4 py-2 text-sm font-medium"
            >
              Connect Wallet
            </Button>
          );
        }

        if (chain.unsupported) {
          return <SwitchNetwork />;
        }

        return (
          <Popover>
            <PopoverTrigger className="bg-secondary text-secondary-foreground rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]">
              {address && shortAddress({ address, startLength: 6, endLength: 4 })}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <TokenBalanceRow
                symbol={symbol ?? '—'}
                balance={formatBalance(tokenA, decimals)}
                chainLogo={<OptimismLogo className="size-4" />}
              />

              <TokenBalanceRow
                symbol={symbolB ?? '—'}
                balance={formatBalance(tokenB, decimalsB)}
                chainLogo={<BaseLogo className="size-4" />}
              />

              <div className="bg-foreground/10 my-1 h-px w-full" />

              {token && symbol && decimals !== undefined && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    watchAsset({
                      type: 'ERC20',
                      options: {
                        address: token,
                        symbol,
                        decimals
                      }
                    })
                  }
                  className="hover:bg-foreground/5 h-auto w-full justify-start gap-2 rounded-md px-3 py-2 text-sm font-normal"
                >
                  <PlusCircle size={16} className="text-muted-foreground shrink-0" />
                  Add {symbol}
                </Button>
              )}

              {address && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigator.clipboard.writeText(address);
                    toast('Copied address');
                  }}
                  className="hover:bg-foreground/5 h-auto w-full justify-start gap-2 rounded-md px-3 py-2 text-sm font-normal"
                >
                  <Copy size={16} className="text-muted-foreground shrink-0" />
                  Copy address
                </Button>
              )}

              <Disconnect />
            </PopoverContent>
          </Popover>
        );
      }}
    </ConnectButton.Custom>
  );
};
