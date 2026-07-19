'use client';

import { useChainId } from 'wagmi';
import { optimismSepolia } from 'wagmi/chains';

interface ContractMap {
  [chainId: number]: `0x${string}`;
}

export function useTokenAContract() {
  const chainId = useChainId();

  const contract: ContractMap = {
    [optimismSepolia.id]: '0xE0C064077B513AfC0858287D75D3721cCf626C2e'
  };

  return contract[chainId];
}
