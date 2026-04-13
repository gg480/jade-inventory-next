'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ========== CSS Keyframes ==========
const fadeInStyle = typeof document !== 'undefined' && !document.getElementById('fade-in-keyframes')
  ? (() => {
      const style = document.createElement('style');
      style.id = 'fade-in-keyframes';
      style.textContent = `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .tab-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 8px 1px rgba(5, 150, 105, 0.15); } }
        .card-glow:hover { animation: glowPulse 1.5s ease-in-out; }
      `;
      document.head.appendChild(style);
      return true;
    })()
  : true;

// ========== Shared Components ==========
const CHART_COLORS = ['#059669', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1', '#ec4899', '#84cc16', '#f97316'];

function formatPrice(v: number | null | undefined) {
  if (v == null) return '¥0.00';
  return `¥${v.toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    in_stock: { label: '在库', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
    sold: { label: '已售', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
    returned: { label: '已退', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    new: { label: '未开始', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    selling: { label: '销售中', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' },
    paid_back: { label: '已回本', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
    cleared: { label: '清仓完毕', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  };
  const info = map[status] || { label: status, className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' };
  return <Badge variant="secondary" className={info.className}>{info.label}</Badge>;
}

function PaybackBar({ rate }: { rate: number }) {
  const pct = Math.min(rate * 100, 100);
  const color = rate >= 1 ? 'bg-emerald-500' : 'bg-sky-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-12 text-right">{(rate * 100).toFixed(1)}%</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mt-1 text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">{desc}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export { fadeInStyle, CHART_COLORS, formatPrice, StatusBadge, PaybackBar, EmptyState, LoadingSkeleton };
