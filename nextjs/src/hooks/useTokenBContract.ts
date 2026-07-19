'use client';

import { baseSepolia } from 'wagmi/chains';

interface ContractMap {
  [chainId: number]: `0x${string}`;
}

export function useTokenBContract() {
  const chainId = baseSepolia.id;

  const contract: ContractMap = {
    [baseSepolia.id]: '0x191Fbac34DF27F9B41baa94d9206067b494F7BEd'
  };

  return contract[chainId];
}
