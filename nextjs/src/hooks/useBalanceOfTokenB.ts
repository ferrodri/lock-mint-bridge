'use client';

import { TOKEN_B_ABI } from '@/lib/abis/tokenB';
import { baseSepoliaClient } from '@/lib/publicClients';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useTokenBContract } from './useTokenBContract';

export function useBalanceOfTokenB() {
  const { address } = useAccount();
  const token = useTokenBContract();

  const balance = useQuery({
    queryKey: ['tokenB-balance', token, address],
    queryFn: () =>
      baseSepoliaClient.readContract({
        address: token,
        abi: TOKEN_B_ABI,
        functionName: 'balanceOf',
        args: [address!]
      }),
    enabled: Boolean(address && token)
  });

  return balance.data;
}
