import { Mint } from '@/components/Mint';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wallet } from '@/components/Wallet';

export const Header = () => {
  return (
    <header className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
      <span className="text-lg font-bold">Lock Mint Bridge</span>
      <div className="flex items-center gap-3">
        <Mint />
        <ThemeToggle />
        <Wallet />
      </div>
    </header>
  );
};
