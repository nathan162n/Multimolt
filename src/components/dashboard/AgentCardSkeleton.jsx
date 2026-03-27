import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function ShimmerBlock({ className }) {
  return (
    <div
      className={cn(
        'rounded-[3px] animate-pulse',
        'bg-gradient-to-r from-[color:var(--color-bg-elevated)] via-[color:var(--color-bg-surface)] to-[color:var(--color-bg-elevated)]',
        'bg-[length:200px_100%]',
        className
      )}
    />
  );
}

export default function AgentCardSkeleton() {
  return (
    <Card className="bg-[color:var(--color-bg-base)] border-[color:var(--color-border-light)] shadow-[var(--shadow-card)]">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShimmerBlock className="w-2 h-2 rounded-full" />
            <ShimmerBlock className="w-24 h-[14px]" />
          </div>
          <ShimmerBlock className="w-12 h-5 rounded-md" />
        </div>
        <ShimmerBlock className="w-16 h-3 mt-2" />
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <ShimmerBlock className="w-4/5 h-3 mb-2" />
        <ShimmerBlock className="w-3/5 h-3 mb-3" />
        <div className="flex items-center justify-between mt-1">
          <ShimmerBlock className="w-[60px] h-[10px]" />
        </div>
      </CardContent>
    </Card>
  );
}
