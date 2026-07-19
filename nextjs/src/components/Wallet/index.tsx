'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { shortAddress } from '@/lib/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAccount } from 'wagmi';
import { Disconnect } from './Disconnect';
import { SwitchNetwork } from './SwitchNetwork';

export const Wallet = () => {
  const { address } = useAccount();

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
            <PopoverContent align="end" className="w-56">
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
