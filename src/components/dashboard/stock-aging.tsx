'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PriceDisplay } from '@/components/shared/price-display';
import type { StockAgingItem } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

interface StockAgingProps {
  data?: StockAgingItem[];
  isLoading: boolean;
  thresholdDays?: number;
}

export function StockAging({ data, isLoading, thresholdDays = 180 }: StockAgingProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          库存积压预警
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            超过{thresholdDays}天
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无积压库存 🎉</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar max-h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">SKU</TableHead>
                  <TableHead className="whitespace-nowrap">品名</TableHead>
                  <TableHead className="whitespace-nowrap">材质</TableHead>
                  <TableHead className="whitespace-nowrap">器型</TableHead>
                  <TableHead className="whitespace-nowrap">成本</TableHead>
                  <TableHead className="whitespace-nowrap">售价</TableHead>
                  <TableHead className="whitespace-nowrap">库龄</TableHead>
                  <TableHead className="whitespace-nowrap">柜位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.skuCode}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{item.name}</TableCell>
                    <TableCell>{item.material}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell><PriceDisplay value={item.costPrice} /></TableCell>
                    <TableCell><PriceDisplay value={item.sellingPrice} /></TableCell>
                    <TableCell>
                      <Badge variant={item.ageDays > 365 ? 'destructive' : 'outline'} className="tabular-nums">
                        {item.ageDays}天
                      </Badge>
                    </TableCell>
                    <TableCell>{item.counter ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
