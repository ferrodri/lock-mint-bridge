'use client';

import { TOKEN_B_ABI } from '@/lib/abis/tokenB';
import { baseSepoliaClient } from '@/lib/publicClients';
import { useQuery } from '@tanstack/react-query';
import { useTokenBContract } from './useTokenBContract';

export function useTokenBMetadata() {
  const token = useTokenBContract();

  const metadata = useQuery({
    queryKey: ['tokenB-metadata', token],
    queryFn: async () => {
      const [symbol, decimals] = await Promise.all([
        baseSepoliaClient.readContract({ address: token, abi: TOKEN_B_ABI, functionName: 'symbol' }),
        baseSepoliaClient.readContract({ address: token, abi: TOKEN_B_ABI, functionName: 'decimals' })
      ]);
      return { symbol, decimals };
    },
    enabled: Boolean(token),
    // Token symbol/decimals are immutable, so fetch once and never refetch.
    staleTime: Infinity,
    gcTime: Infinity
  });

  return {
    symbol: metadata.data?.symbol,
    decimals: metadata.data?.decimals
  };
}
