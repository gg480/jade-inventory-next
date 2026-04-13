'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Package, Wallet, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';
import type { DashboardSummary } from '@/lib/api';
import { PriceDisplay } from '@/components/shared/price-display';
import { motion } from 'framer-motion';

interface OverviewCardsProps {
  data?: DashboardSummary;
  isLoading: boolean;
}

const cards = [
  { key: 'totalItems' as const, label: '库存总量', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  { key: 'stockValue' as const, label: '库存市值', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950', isPrice: true },
  { key: 'monthRevenue' as const, label: '本月营收', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950', isPrice: true },
  { key: 'monthProfit' as const, label: '本月利润', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950', isPrice: true },
  { key: 'monthSoldCount' as const, label: '本月售出', icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
];

export function OverviewCards({ data, isLoading }: OverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const value = data?.[card.key];
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                    {isLoading ? (
                      <div className="mt-1 h-6 w-20 animate-pulse rounded bg-muted" />
                    ) : card.isPrice ? (
                      <PriceDisplay value={value as number} className="text-lg font-bold" />
                    ) : (
                      <p className="text-lg font-bold tabular-nums">{value ?? '-'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
