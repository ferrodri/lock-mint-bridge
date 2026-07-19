'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeftRight } from 'lucide-react';
import { useSwitchChain } from 'wagmi';
import { optimismSepolia } from 'wagmi/chains';
import { Disconnect } from './Disconnect';

export const SwitchNetwork = () => {
  const { switchChain } = useSwitchChain();

  return (
    <Popover>
      <PopoverTrigger className="rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-destructive/90">
        Switch to {optimismSepolia.name}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <Button
          type="button"
          variant="ghost"
          onClick={() => switchChain({ chainId: optimismSepolia.id })}
          className="hover:bg-foreground/5 h-auto w-full justify-start gap-2 rounded-md px-3 py-2 text-sm font-normal"
        >
          <ArrowLeftRight size={16} className="text-muted-foreground shrink-0" />
          <span>
            Switch to <strong>{optimismSepolia.name}</strong>
          </span>
        </Button>
        <Disconnect />
      </PopoverContent>
    </Popover>
  );
};
