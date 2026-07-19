'use client';

import { useChainId } from 'wagmi';
import { optimismSepolia } from 'wagmi/chains';

interface ContractMap {
  [chainId: number]: `0x${string}`;
}

export function useLockBridgeContract() {
  const chainId = useChainId();

  const contract: ContractMap = {
    [optimismSepolia.id]: '0x645616D46EB1eCebC1AB1c9927192867DE0DC28C'
  };

  return contract[chainId];
}
