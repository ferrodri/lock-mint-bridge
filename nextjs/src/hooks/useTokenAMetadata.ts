'use client';

import { TOKEN_A_ABI } from '@/lib/abis/tokenA';
import { useReadContracts } from 'wagmi';
import { useTokenAContract } from './useTokenAContract';

export function useTokenAMetadata() {
  const token = useTokenAContract();

  const metadata = useReadContracts({
    contracts: [
      { address: token, abi: TOKEN_A_ABI, functionName: 'symbol' },
      { address: token, abi: TOKEN_A_ABI, functionName: 'decimals' }
    ],
    // Token symbol/decimals are immutable, so fetch once and never refetch.
    query: { enabled: Boolean(token), staleTime: Infinity, gcTime: Infinity }
  });

  const [symbol, decimals] = metadata.data ?? [];

  return {
    symbol: symbol?.result,
    decimals: decimals?.result
  };
}
