'use client';

import { BaseLogo, OptimismLogo } from '@/components/ui/chain-logos';
import { ArrowRight } from 'lucide-react';
import { BridgeForm } from './BridgeForm';
import { BridgeStatus } from './BridgeStatus';
import { BridgeProvider, useBridgeContext } from './context';

const BridgeContent = () => {
  const { phase } = useBridgeContext();
  // The form collects the amount; every in-flight/terminal phase renders the progress view.
  return phase === 'form' ? <BridgeForm /> : <BridgeStatus />;
};

export const Bridge = () => {
  return (
    <BridgeProvider>
      <div className="bg-card w-full max-w-md rounded-2xl border border-border p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Bridge</h2>
          <div className="text-muted-foreground flex items-center gap-1.5">
            <OptimismLogo className="size-5" />
            <ArrowRight size={12} />
            <BaseLogo className="size-5" />
          </div>
        </div>
        <BridgeContent />
      </div>
    </BridgeProvider>
  );
};
