'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const OPTIONS = [
  { value: 'system', label: 'Auto', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon }
] as const;

const emptySubscribe = () => () => {};

// SSR-safe "is client" flag: false during SSR/hydration, true afterwards, without a
// setState-in-effect. The theme is only known on the client.
const useMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const active = mounted ? (theme ?? 'system') : 'system';
  const ActiveIcon = OPTIONS.find((option) => option.value === active)?.icon ?? Monitor;

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Toggle theme"
        className="bg-secondary text-secondary-foreground flex size-9 items-center justify-center rounded-full transition-colors hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]"
      >
        <ActiveIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 gap-0.5 p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            variant="ghost"
            onClick={() => setTheme(value)}
            className={cn(
              'hover:bg-foreground/5 h-auto w-full justify-start gap-2 rounded-md px-3 py-2 text-sm font-normal',
              active === value && 'bg-foreground/5'
            )}
          >
            <Icon className="size-4" />
            {label}
            {active === value && <Check className="ml-auto size-4" />}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
};
