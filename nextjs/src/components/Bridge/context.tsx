'use client';

import { createContext, useContext } from 'react';
import { useBridge } from './useBridge';

type BridgeContextValue = ReturnType<typeof useBridge>;

const BridgeContext = createContext<BridgeContextValue | null>(null);

export function useBridgeContext() {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error('useBridgeContext must be used within a BridgeProvider');
  }
  return context;
}

export const BridgeProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useBridge();
  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
};
