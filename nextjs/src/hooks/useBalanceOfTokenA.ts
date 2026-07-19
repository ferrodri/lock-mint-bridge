'use client';

import { TOKEN_A_ABI } from '@/lib/abis/tokenA';
import { useAccount, useReadContract } from 'wagmi';
import { useTokenAContract } from './useTokenAContract';

export function useBalanceOfTokenA() {
  const { address } = useAccount();
  const token = useTokenAContract();

  const balance = useReadContract({
    address: token,
    abi: TOKEN_A_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: Boolean(address && token) }
  });

  return balance.data;
}
