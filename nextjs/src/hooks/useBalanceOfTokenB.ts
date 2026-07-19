'use client';

import { TOKEN_B_ABI } from '@/lib/abis/tokenB';
import { useAccount, useReadContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useTokenBContract } from './useTokenBContract';

export function useBalanceOfTokenB() {
  const { address } = useAccount();
  const token = useTokenBContract();

  const balance = useReadContract({
    address: token,
    abi: TOKEN_B_ABI,
    functionName: 'balanceOf',
    args: [address!],
    chainId: baseSepolia.id,
    query: { enabled: Boolean(address && token) }
  });

  return balance.data;
}
