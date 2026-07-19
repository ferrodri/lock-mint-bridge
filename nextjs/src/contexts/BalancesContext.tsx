'use client';

import { createContext, type Dispatch, type SetStateAction, useContext, useState } from 'react';

type BalancesContextValue = {
  refetchBalances: boolean;
  setRefetchBalances: Dispatch<SetStateAction<boolean>>;
};

const BalancesContext = createContext<BalancesContextValue | undefined>(undefined);

export function useBalancesContext() {
  const context = useContext(BalancesContext);
  if (!context) {
    throw new Error('useBalancesContext must be used within a BalancesProvider');
  }
  return context;
}

export const BalancesProvider = ({ children }: { children: React.ReactNode }) => {
  const [refetchBalances, setRefetchBalances] = useState(false);

  return (
    <BalancesContext.Provider value={{ refetchBalances, setRefetchBalances }}>{children}</BalancesContext.Provider>
  );
};
