import { TokenAvatar } from '@/components/TokenAvatar';

type TokenBalanceRowProps = {
  symbol: string;
  balance: string;
  chainLogo: React.ReactNode;
};

export const TokenBalanceRow = ({ symbol, balance, chainLogo }: TokenBalanceRowProps) => {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-3">
        <TokenAvatar symbol={symbol} chainLogo={chainLogo} ringClassName="ring-popover" />
        <span className="text-sm font-medium">{symbol}</span>
      </div>
      <span className="text-sm font-medium tabular-nums">{balance}</span>
    </div>
  );
};
