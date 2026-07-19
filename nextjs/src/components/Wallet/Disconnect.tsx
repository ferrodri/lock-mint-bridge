'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useDisconnect } from 'wagmi';

export const Disconnect = () => {
  const { disconnect } = useDisconnect();

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => disconnect()}
      className="h-auto w-full justify-start gap-2 rounded-md px-3 py-2 text-sm font-normal text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
    >
      <LogOut size={16} className="shrink-0" />
      Disconnect
    </Button>
  );
};
