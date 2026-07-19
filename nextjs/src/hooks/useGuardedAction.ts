'use client';

import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useSwitchChain } from 'wagmi';
import { optimismSepolia } from 'wagmi/chains';

type GuardedAction = {
  label: string;
  onClick: () => void;
  ready: boolean;
};

export const useGuardedAction = (action: () => void, label: string): GuardedAction => {
  const { isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return { label: 'Connect wallet', onClick: () => openConnectModal?.(), ready: false };
  }

  if (chainId !== optimismSepolia.id) {
    return {
      label: `Switch to ${optimismSepolia.name}`,
      onClick: () => switchChain({ chainId: optimismSepolia.id }),
      ready: false
    };
  }

  return { label, onClick: action, ready: true };
};
