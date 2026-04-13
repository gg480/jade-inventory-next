'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { batchesApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge, PaybackBar } from './shared';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { Layers } from 'lucide-react';

// ========== Batch Detail Dialog ==========
function BatchDetailDialog({ batchId, open, onOpenChange }: { batchId: number | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchBatchDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const data = await batchesApi.getBatch(id);
      setBatch(data);
    } catch {
      toast.error('加载批次详情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && batchId) {
      fetchBatchDetail(batchId);
    } else {
      setBatch(null);
    }
  }, [open, batchId, fetchBatchDetail]);

  const specFieldLabels: Record<string, string> = {
    weight: '克重(g)', metalWeight: '金重(g)', size: '尺寸', braceletSize: '圈口',
    beadCount: '颗数', beadDiameter: '珠径', ringSize: '戒圈',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-600" />
            批次详情
          </DialogTitle>
          <DialogDescription>{batch?.batchCode || ''}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3 py-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-32 w-full" /></div>
        ) : batch ? (
          <div className="space-y-4 py-2">
            {/* Batch Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">材质</p>
                <p className="font-bold text-sm">{batch.materialName || '-'}</p>
              </div>
              <div className="bg-sky-50 dark:bg-sky-950/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">总成本</p>
                <p className="font-bold text-sm">{formatPrice(batch.totalCost)}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">已售/总数</p>
                <p className="font-bold text-sm">{batch.soldCount}/{batch.quantity}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">已回款</p>
                <p className="font-bold text-sm">{formatPrice(batch.revenue)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">器型: {batch.typeName || '-'}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">供应商: {batch.supplierName || '-'}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">采购日期: {batch.purchaseDate || '-'}</span>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={batch.status} />
              <PaybackBar rate={batch.paybackRate} />
              <span className={`text-sm font-medium ${batch.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                利润 {formatPrice(batch.profit)}
              </span>
            </div>

            <Separator />

            {/* Items List */}
            <div>
              <p className="text-sm font-medium mb-2">批次内货品 ({batch.items?.length || 0} 件)</p>
              {batch.items && batch.items.length > 0 ? (
                <div className="overflow-x-auto max-h-72 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead><TableHead>名称</TableHead><TableHead>器型</TableHead>
                        <TableHead className="text-right">分摊成本</TableHead><TableHead className="text-right">售价</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batch.items.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-mono text-xs">{item.skuCode}</TableCell>
                          <TableCell className="text-sm">{item.name || '-'}</TableCell>
                          <TableCell className="text-sm">{item.type?.name || '-'}</TableCell>
                          <TableCell className="text-right text-sm">{formatPrice(item.allocatedCost)}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-emerald-600">{formatPrice(item.sellingPrice)}</TableCell>
                          <TableCell><StatusBadge status={item.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">该批次下暂无货品</p>
              )}
            </div>

            {/* Notes */}
            {batch.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">备注</p>
                  <p className="text-sm text-muted-foreground">{batch.notes}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">未找到批次信息</div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BatchDetailDialog;
