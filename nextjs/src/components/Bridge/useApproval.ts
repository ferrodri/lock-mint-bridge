'use client';

import { useTransactionToast } from '@/components/toast/useTransactionToast';
import { useLockBridgeContract } from '@/hooks/useLockBridgeContract';
import { useTokenAContract } from '@/hooks/useTokenAContract';
import { useTokenAMetadata } from '@/hooks/useTokenAMetadata';
import { TOKEN_A_ABI } from '@/lib/abis/tokenA';
import { useCallback } from 'react';
import { type Hex } from 'viem';
import { useAccount, useConfig, useReadContract, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { optimismSepolia } from 'wagmi/chains';

export function useApproval() {
  const { address } = useAccount();
  const config = useConfig();
  const token = useTokenAContract();
  const lockBridge = useLockBridgeContract();
  const { symbol } = useTokenAMetadata();

  const { writeContractAsync, data, error, reset } = useWriteContract();
  useTransactionToast({ hash: data, title: `Approving ${symbol ?? 'token'}`, error });

  const { refetch } = useReadContract({
    address: token,
    abi: TOKEN_A_ABI,
    functionName: 'allowance',
    args: [address!, lockBridge!],
    query: { enabled: Boolean(address && token && lockBridge) }
  });

  // Read the live allowance at call time; a prior (unspent) approval may not be in the cache yet.
  const hasAllowance = useCallback(
    async (amount: bigint) => {
      const { data: current } = await refetch();
      return typeof current === 'bigint' && current >= amount;
    },
    [refetch]
  );

  const approve = useCallback(
    async ({ amount, onHash }: { amount: bigint; onHash?: (hash: Hex) => void }) => {
      if (!token || !lockBridge) {
        return false;
      }
      const hash = await writeContractAsync({
        address: token,
        abi: TOKEN_A_ABI,
        functionName: 'approve',
        args: [lockBridge, amount]
      });
      onHash?.(hash);
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: optimismSepolia.id });
      return receipt.status === 'success';
    },
    [token, lockBridge, writeContractAsync, config]
  );

  return { hasAllowance, approve, reset };
}
