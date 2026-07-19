'use client';

import { useTransactionToast } from '@/components/toast/useTransactionToast';
import { useLockBridgeContract } from '@/hooks/useLockBridgeContract';
import { useTokenAMetadata } from '@/hooks/useTokenAMetadata';
import { LOCK_BRIDGE_ABI } from '@/lib/abis/lockBridge';
import { encodeEvmInteroperableAddress } from '@/lib/interoperableAddress';
import { useCallback } from 'react';
import { type Hex } from 'viem';
import { useAccount, useConfig, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { baseSepolia, optimismSepolia } from 'wagmi/chains';

// Owns the lock leg: sends crosschainTransfer on OP Sepolia and resolves once it's mined.
export function useLock() {
  const { address } = useAccount();
  const config = useConfig();
  const lockBridge = useLockBridgeContract();
  const { symbol } = useTokenAMetadata();

  const { writeContractAsync, data, error, reset } = useWriteContract();
  useTransactionToast({ hash: data, title: `Bridging ${symbol ?? 'token'} to Base Sepolia`, error });

  const lock = useCallback(
    async (amount: bigint, onHash?: (hash: Hex) => void) => {
      if (!address || !lockBridge) {
        return false;
      }
      const hash = await writeContractAsync({
        address: lockBridge,
        abi: LOCK_BRIDGE_ABI,
        functionName: 'crosschainTransfer',
        args: [encodeEvmInteroperableAddress(baseSepolia.id, address), amount]
      });
      onHash?.(hash);
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: optimismSepolia.id });
      return receipt.status === 'success';
    },
    [address, lockBridge, writeContractAsync, config]
  );

  return { lock, reset };
}
