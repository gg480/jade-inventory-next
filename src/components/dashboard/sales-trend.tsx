'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { TrendData } from '@/lib/api';
import { TrendingUp } from 'lucide-react';

interface SalesTrendProps {
  data?: TrendData[];
  isLoading: boolean;
}

export function SalesTrend({ data, isLoading }: SalesTrendProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          销售趋势
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-72 animate-pulse rounded bg-muted" />
        ) : !data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无数据</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { revenue: '营收', profit: '利润', count: '数量' };
                  return name === 'count'
                    ? [`${value} 件`, labels[name]]
                    : [`¥${value.toLocaleString()}`, labels[name] || name];
                }}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Legend formatter={(value: string) => {
                const labels: Record<string, string> = { revenue: '营收', profit: '利润', count: '数量' };
                return labels[value] || value;
              }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#34d399"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorProfit)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
