'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { ProfitByCategory, ProfitByChannel } from '@/lib/api';
import { BarChart3, PieChartIcon } from 'lucide-react';

const JADE_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46'];

interface ProfitChartsProps {
  categoryData?: ProfitByCategory[];
  channelData?: ProfitByChannel[];
  isLoading: boolean;
}

export function ProfitCharts({ categoryData, channelData, isLoading }: ProfitChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Profit by Category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            品类利润分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 animate-pulse rounded bg-muted" />
          ) : !categoryData?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" width={60} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="profit" name="利润" fill="#059669" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="revenue" name="营收" fill="#a7f3d0" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Profit by Channel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-4 w-4 text-emerald-600" />
            渠道利润占比
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 animate-pulse rounded bg-muted" />
          ) : !channelData?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={channelData}
                  dataKey="profit"
                  nameKey="channel"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ channel, percent }: { channel: string; percent: number }) =>
                    `${channel} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {channelData.map((_entry, index) => (
                    <Cell key={index} fill={JADE_COLORS[index % JADE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, '利润']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
