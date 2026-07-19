'use client';

import { useTransactionToast } from '@/components/toast/useTransactionToast';
import { Button } from '@/components/ui/button';
import { useBalancesContext } from '@/contexts/BalancesContext';
import { useTokenAContract } from '@/hooks/useTokenAContract';
import { TOKEN_A_ABI } from '@/lib/abis/tokenA';
import { Loader2 } from 'lucide-react';
import { parseUnits } from 'viem';
import { useAccount, useWriteContract } from 'wagmi';
import { optimismSepolia } from 'wagmi/chains';

const MINT_AMOUNT = parseUnits('1000', 18);

export const Mint = () => {
  const { address, isConnected, chainId } = useAccount();
  const token = useTokenAContract();
  const { setRefetchBalances } = useBalancesContext();
  const mintTx = useWriteContract();
  const { isConfirming } = useTransactionToast({
    hash: mintTx.data,
    title: 'Minting 1,000 tokens',
    error: mintTx.error,
    onConfirmed: () => {
      mintTx.reset();
      setRefetchBalances(true);
    }
  });

  if (!isConnected || chainId !== optimismSepolia.id || !address || !token) {
    return null;
  }

  const busy = mintTx.isPending || isConfirming;

  const handleClick = () => {
    mintTx.writeContract({
      address: token,
      abi: TOKEN_A_ABI,
      functionName: 'mint',
      args: [address, MINT_AMOUNT]
    });
  };

  return (
    <Button
      type="button"
      variant="default"
      onClick={handleClick}
      disabled={busy}
      className="h-auto min-w-[160px] rounded-full px-4 py-2 text-sm font-medium"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : 'Mint 1,000 tokens'}
    </Button>
  );
};
