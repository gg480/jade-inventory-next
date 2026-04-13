'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/shared/progress-bar';
import { PriceDisplay } from '@/components/shared/price-display';
import type { BatchProfit } from '@/lib/api';
import { Layers } from 'lucide-react';

interface BatchPaybackProps {
  data?: BatchProfit[];
  isLoading: boolean;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  completed: { label: '已回本', variant: 'default' },
  partial: { label: '部分回本', variant: 'outline' },
  pending: { label: '未回本', variant: 'secondary' },
};

export function BatchPayback({ data, isLoading }: BatchPaybackProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-emerald-600" />
          批次回本看板
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无批次数据</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">批次号</TableHead>
                  <TableHead className="whitespace-nowrap">材质</TableHead>
                  <TableHead className="whitespace-nowrap">总成本</TableHead>
                  <TableHead className="whitespace-nowrap">已售/总量</TableHead>
                  <TableHead className="whitespace-nowrap">营收</TableHead>
                  <TableHead className="whitespace-nowrap">利润</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[140px]">回本进度</TableHead>
                  <TableHead className="whitespace-nowrap">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const st = statusLabels[row.status] || { label: row.status, variant: 'outline' as const };
                  return (
                    <TableRow key={row.batchCode}>
                      <TableCell className="font-mono text-xs">{row.batchCode}</TableCell>
                      <TableCell>{row.material}</TableCell>
                      <TableCell><PriceDisplay value={row.totalCost} /></TableCell>
                      <TableCell className="tabular-nums">
                        {row.soldCount}/{row.totalCount}
                      </TableCell>
                      <TableCell><PriceDisplay value={row.revenue} /></TableCell>
                      <TableCell>
                        <PriceDisplay value={row.profit} className={row.profit >= 0 ? 'text-emerald-600' : 'text-red-500'} />
                      </TableCell>
                      <TableCell>
                        <ProgressBar value={row.paybackRate} size="sm" />
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
