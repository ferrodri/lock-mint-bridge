'use client';

import { useChainId } from 'wagmi';
import { optimismSepolia } from 'wagmi/chains';

interface ContractMap {
  [chainId: number]: `0x${string}`;
}

export function useLockBridgeContract() {
  const chainId = useChainId();

  const contract: ContractMap = {
    [optimismSepolia.id]: '0xdF6E6dE9bD34d9c95FE4681CAF320D00b1314cB3'
  };

  return contract[chainId];
}
