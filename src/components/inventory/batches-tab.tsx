'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { batchesApi, exportApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge, PaybackBar, EmptyState, LoadingSkeleton } from './shared';
import BatchCreateDialog from './batch-create-dialog';
import BatchDetailDialog from './batch-detail-dialog';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  Layers, CheckCircle, TrendingUp, DollarSign, Plus, Eye, FileDown, ClipboardList,
} from 'lucide-react';

// ========== Batches Tab ==========
function BatchesTab() {
  const [batches, setBatches] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailBatchId, setDetailBatchId] = useState<number | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await batchesApi.getBatches({ page: pagination.page, size: pagination.size });
      setBatches(data.items || []);
      setPagination(data.pagination || { total: 0, page: 1, size: 20, pages: 0 });
    } catch { toast.error('加载批次失败'); } finally { setLoading(false); }
  }, [pagination.page]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  async function handleAllocate(batchId: number) {
    try {
      const result = await batchesApi.allocateBatch(batchId);
      toast.success(`成本分摊完成！共 ${result.items?.length || 0} 件货品`);
      fetchBatches();
    } catch (e: any) { toast.error(e.message || '分摊失败'); }
  }

  if (loading && batches.length === 0) return <LoadingSkeleton />;

  const totalCost = batches.reduce((s, b) => s + (b.totalCost || 0), 0);
  const totalRevenue = batches.reduce((s, b) => s + (b.revenue || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="relative overflow-hidden border-l-4 border-l-sky-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><Layers className="h-16 w-16 text-sky-500" /></div>
            <p className="text-sm text-muted-foreground">总批次</p><p className="text-2xl font-bold">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><CheckCircle className="h-16 w-16 text-emerald-500" /></div>
            <p className="text-sm text-muted-foreground">已回本</p><p className="text-2xl font-bold text-emerald-600">{batches.filter(b => b.status === 'paid_back' || b.status === 'cleared').length}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><TrendingUp className="h-16 w-16 text-amber-500" /></div>
            <p className="text-sm text-muted-foreground">销售中</p><p className="text-2xl font-bold text-sky-600">{batches.filter(b => b.status === 'selling').length}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><DollarSign className="h-16 w-16 text-purple-500" /></div>
            <p className="text-sm text-muted-foreground">总投入</p><p className="text-2xl font-bold">{formatPrice(totalCost)}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><ClipboardList className="h-16 w-16 text-orange-500" /></div>
            <p className="text-sm text-muted-foreground">待录入</p><p className="text-2xl font-bold text-orange-600">{batches.filter(b => (b.itemsCount || 0) < (b.quantity || 0)).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => setShowCreate(true)}><Plus className="h-3 w-3 mr-1" />新建批次</Button>
        <a href={exportApi.batches()} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="h-9"><FileDown className="h-3 w-3 mr-1" />导出</Button>
        </a>
      </div>

      {batches.length === 0 ? (
        <EmptyState icon={Layers} title="暂无批次" desc="还没有创建任何批次" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>批次编号</TableHead><TableHead>材质</TableHead><TableHead className="text-right">总成本</TableHead>
                    <TableHead className="text-right">数量</TableHead><TableHead className="text-right">已录入</TableHead><TableHead>分摊方式</TableHead><TableHead className="text-right">已售</TableHead>
                    <TableHead className="text-right">已回款</TableHead><TableHead>回本进度</TableHead><TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map(b => (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailBatchId(b.id)}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-1.5">
                          {b.batchCode}
                          {(b.itemsCount || 0) > 0 ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">已关联货品</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">未录入</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{b.materialName}</TableCell>
                      <TableCell className="text-right">{formatPrice(b.totalCost)}</TableCell>
                      <TableCell className="text-right">{b.quantity}</TableCell>
                      <TableCell className="text-right">
                        <span className={(b.itemsCount || 0) >= (b.quantity || 0) ? 'text-emerald-600 font-medium' : (b.itemsCount || 0) > 0 ? 'text-amber-600' : 'text-muted-foreground'}>
                          {b.itemsCount || 0}/{b.quantity}
                        </span>
                      </TableCell>
                      <TableCell><Badge variant="outline">{({ equal: '均摊', by_weight: '按克重', by_price: '按售价' } as any)[b.costAllocMethod] || b.costAllocMethod}</Badge></TableCell>
                      <TableCell className="text-right">{b.soldCount}/{b.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(b.revenue)}</TableCell>
                      <TableCell><PaybackBar rate={b.paybackRate} /></TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDetailBatchId(b.id)} title="查看详情"><Eye className="h-3 w-3" /></Button>
                          {b.itemsCount === b.quantity && b.soldCount === 0 && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAllocate(b.id)}>分摊</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>上一页</Button>
          <span className="text-sm text-muted-foreground">{pagination.page} / {pagination.pages}</span>
          <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>下一页</Button>
        </div>
      )}

      {/* Dialogs */}
      <BatchCreateDialog open={showCreate} onOpenChange={setShowCreate} onSuccess={fetchBatches} />
      <BatchDetailDialog batchId={detailBatchId} open={detailBatchId != null} onOpenChange={o => { if (!o) setDetailBatchId(null); }} />
    </div>
  );
}

export default BatchesTab;
