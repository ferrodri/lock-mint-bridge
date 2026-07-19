'use client';

import { baseSepolia } from 'wagmi/chains';

interface ContractMap {
  [chainId: number]: `0x${string}`;
}

export function useTokenBContract() {
  const chainId = baseSepolia.id;

  const contract: ContractMap = {
    [baseSepolia.id]: '0x241Fb2FF9eDe4b68f9DeF8DC8e9AdE52D75Dc8e7'
  };

  return contract[chainId];
}
