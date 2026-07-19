'use client';

import { useBalancesContext } from '@/contexts/BalancesContext';
import { TOKEN_A_ABI } from '@/lib/abis/tokenA';
import { useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useTokenAContract } from './useTokenAContract';

export function useBalanceOfTokenA() {
  const { address } = useAccount();
  const token = useTokenAContract();
  const { refetchBalances, setRefetchBalances } = useBalancesContext();

  const { data, refetch } = useReadContract({
    address: token,
    abi: TOKEN_A_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: Boolean(address && token) }
  });

  useEffect(() => {
    if (refetchBalances) {
      setRefetchBalances(false);
      refetch();
    }
  }, [refetchBalances, setRefetchBalances, refetch]);

  return data;
}
