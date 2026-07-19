'use client';

import { TOKEN_B_ABI } from '@/lib/abis/tokenB';
import { useReadContracts } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useTokenBContract } from './useTokenBContract';

export function useTokenBMetadata() {
  const token = useTokenBContract();

  const metadata = useReadContracts({
    contracts: [
      { address: token, abi: TOKEN_B_ABI, functionName: 'symbol', chainId: baseSepolia.id },
      { address: token, abi: TOKEN_B_ABI, functionName: 'decimals', chainId: baseSepolia.id }
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
