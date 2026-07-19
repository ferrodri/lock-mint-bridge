'use client';

import { useChainId } from 'wagmi';
import { optimismSepolia } from 'wagmi/chains';

interface ContractMap {
  [chainId: number]: `0x${string}`;
}

export function useTokenAContract() {
  const chainId = useChainId();

  const contract: ContractMap = {
    [optimismSepolia.id]: '0x83D94B802F5D9c7EeF56fC6c0E92eeBB11cf83C9'
  };

  return contract[chainId];
}
