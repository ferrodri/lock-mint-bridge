import { cn } from '@/lib/utils';

type TokenAvatarProps = {
  symbol: string;
  chainLogo: React.ReactNode;
  // Ring color should match the surface the avatar sits on so the badge reads as separate.
  ringClassName?: string;
};

export const TokenAvatar = ({ symbol, chainLogo, ringClassName = 'ring-card' }: TokenAvatarProps) => {
  return (
    <div className="relative shrink-0">
      <div className="bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-full text-[9px] font-bold tracking-tight">
        {symbol}
      </div>
      <span className={cn('absolute -right-0.5 -bottom-0.5 flex rounded-full ring-2', ringClassName)}>{chainLogo}</span>
    </div>
  );
};
