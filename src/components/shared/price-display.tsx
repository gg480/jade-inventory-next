'use client';

import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  value: number | undefined | null;
  className?: string;
  prefix?: string;
  showSign?: boolean;
}

export function PriceDisplay({ value, className, prefix = '¥', showSign = false }: PriceDisplayProps) {
  if (value == null) return <span className={cn('text-muted-foreground', className)}>-</span>;

  const formatted = `${prefix}${Math.abs(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <span
      className={cn(
        'font-medium tabular-nums',
        showSign && value > 0 && 'text-emerald-600',
        showSign && value < 0 && 'text-red-500',
        className
      )}
    >
      {showSign && value > 0 ? '+' : ''}
      {formatted}
    </span>
  );
}
