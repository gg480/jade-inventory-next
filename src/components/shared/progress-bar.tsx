'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ProgressBar({ value, className, showLabel = true, size = 'md' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const colorClass =
    clamped >= 100
      ? 'text-emerald-600'
      : clamped >= 70
        ? 'text-jade-600'
        : clamped >= 40
          ? 'text-amber-500'
          : 'text-red-500';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress value={clamped} className={cn('flex-1', size === 'sm' ? 'h-1.5' : 'h-2')} />
      {showLabel && (
        <span className={cn('text-xs font-medium tabular-nums whitespace-nowrap', colorClass)}>
          {clamped.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
