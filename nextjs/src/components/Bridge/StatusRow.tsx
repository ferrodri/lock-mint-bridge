import { cn } from '@/lib/utils';
import { Check, ExternalLink, Loader2 } from 'lucide-react';

export const StatusRow = ({
  done,
  pending,
  href,
  children
}: {
  done: boolean;
  pending: boolean;
  href?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="bg-secondary/40 border-border flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-5 items-center justify-center rounded-full',
            done ? 'bg-primary/15 text-primary' : 'text-muted-foreground bg-foreground/5'
          )}
        >
          {done ? <Check size={13} /> : pending ? <Loader2 size={13} className="animate-spin" /> : null}
        </span>
        <span className={cn(done ? 'font-medium' : 'text-muted-foreground')}>{children}</span>
      </div>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
          <ExternalLink size={15} />
        </a>
      )}
    </div>
  );
};
