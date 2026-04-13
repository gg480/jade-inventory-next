'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { batchesApi, exportApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge, PaybackBar, EmptyState, LoadingSkeleton } from './shared';
import BatchCreateDialog from './batch-create-dialog';
import BatchDetailDialog from './batch-detail-dialog';
import Pagination from './pagination';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  Layers, CheckCircle, TrendingUp, DollarSign, Plus, Eye, FileDown, ClipboardList, Pencil, Trash2, Clock,
} from 'lucide-react';

// ========== Batches Tab ==========
function BatchesTab() {
  const [batches, setBatches] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailBatchId, setDetailBatchId] = useState<number | null>(null);

  // Edit dialog
  const [editDialog, setEditDialog] = useState<{ open: boolean; batch: any }>({ open: false, batch: null });
  const [editForm, setEditForm] = useState({ totalCost: 0, quantity: 0, purchaseDate: '', supplierName: '', note: '' });

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; batch: any }>({ open: false, batch: null });

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

  function openEditDialog(batch: any) {
    setEditDialog({ open: true, batch });
    setEditForm({
      totalCost: batch.totalCost || 0,
      quantity: batch.quantity || 0,
      purchaseDate: batch.purchaseDate || '',
      supplierName: batch.supplierName || '',
      note: batch.note || '',
    });
  }

  async function handleEdit() {
    if (!editDialog.batch) return;
    try {
      await batchesApi.updateBatch(editDialog.batch.id, editForm);
      toast.success('批次更新成功');
      setEditDialog({ open: false, batch: null });
      fetchBatches();
    } catch (e: any) { toast.error(e.message || '更新失败'); }
  }

  async function handleDelete() {
    if (!deleteDialog.batch) return;
    try {
      await batchesApi.deleteBatch(deleteDialog.batch.id);
      toast.success('批次删除成功');
      setDeleteDialog({ open: false, batch: null });
      fetchBatches();
    } catch (e: any) {
      toast.error(e.message || '删除失败');
    }
  }

  if (loading && batches.length === 0) return <LoadingSkeleton />;

  const totalCost = batches.reduce((s, b) => s + (b.totalCost || 0), 0);
  const totalRevenue = batches.reduce((s, b) => s + (b.revenue || 0), 0);

  const allocMethodLabels: Record<string, string> = { equal: '均摊', by_weight: '按克重', by_price: '按售价' };

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
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block">
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
                          {(() => {
                            const itemsCount = b.itemsCount || 0;
                            const quantity = b.quantity || 0;
                            const pct = quantity > 0 ? Math.round((itemsCount / quantity) * 100) : 0;
                            const barColor = pct === 0 ? 'bg-gray-300 dark:bg-gray-600' : pct <= 50 ? 'bg-amber-500' : pct < 100 ? 'bg-sky-500' : 'bg-emerald-500';
                            const isInProgress = pct > 0 && pct < 100;
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className={itemsCount >= quantity ? 'text-emerald-600 font-medium' : itemsCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}>
                                    {itemsCount}/{quantity}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{pct}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${barColor} ${isInProgress ? 'animate-pulse' : ''}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell><Badge variant="outline">{allocMethodLabels[b.costAllocMethod] || b.costAllocMethod}</Badge></TableCell>
                        <TableCell className="text-right">{b.soldCount}/{b.quantity}</TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(b.revenue)}</TableCell>
                        <TableCell><PaybackBar rate={b.paybackRate} /></TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDetailBatchId(b.id)} title="查看详情"><Eye className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-600" onClick={() => openEditDialog(b)} title="编辑"><Pencil className="h-3 w-3" /></Button>
                            {b.itemsCount === b.quantity && b.soldCount === 0 && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAllocate(b.id)}>分摊</Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => setDeleteDialog({ open: true, batch: b })} title="删除"><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {batches.map(b => (
              <Card key={b.id} className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer" onClick={() => setDetailBatchId(b.id)}>
                <CardContent className="p-4 space-y-2">
                  {/* Header: batch code + status */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium">{b.batchCode}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  {/* Material + entry progress */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{b.materialName}</span>
                    {(() => {
                      const itemsCount = b.itemsCount || 0;
                      const quantity = b.quantity || 0;
                      const pct = quantity > 0 ? Math.round((itemsCount / quantity) * 100) : 0;
                      const barColor = pct === 0 ? 'bg-gray-300 dark:bg-gray-600' : pct <= 50 ? 'bg-amber-500' : pct < 100 ? 'bg-sky-500' : 'bg-emerald-500';
                      const isInProgress = pct > 0 && pct < 100;
                      return (
                        <div className="flex-1 ml-3 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${itemsCount >= quantity ? 'text-emerald-600 font-medium' : itemsCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {itemsCount}/{quantity}件
                            </span>
                            <span className="text-[10px] text-muted-foreground">{pct}%</span>
                          </div>
                          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${barColor} ${isInProgress ? 'animate-pulse' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Cost + Revenue row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">总成本</p>
                      <p className="font-medium">{formatPrice(b.totalCost)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">已回款</p>
                      <p className="font-medium text-emerald-600">{formatPrice(b.revenue)}</p>
                    </div>
                  </div>
                  {/* Payback bar */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>回本进度</span>
                      <span>{(b.paybackRate * 100).toFixed(1)}%</span>
                    </div>
                    <PaybackBar rate={b.paybackRate} />
                  </div>
                  {/* Sold count */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>已售 {b.soldCount}/{b.quantity}</span>
                    {b.purchaseDate && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.purchaseDate}</span>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 pt-1 border-t" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs flex-1" onClick={() => setDetailBatchId(b.id)}><Eye className="h-3 w-3 mr-1" />详情</Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-amber-600" onClick={() => openEditDialog(b)}><Pencil className="h-3 w-3" /></Button>
                    {b.itemsCount === b.quantity && b.soldCount === 0 && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleAllocate(b.id)}>分摊</Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600" onClick={() => setDeleteDialog({ open: true, batch: b })}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} />

      {/* Dialogs */}
      <BatchCreateDialog open={showCreate} onOpenChange={setShowCreate} onSuccess={fetchBatches} />
      <BatchDetailDialog batchId={detailBatchId} open={detailBatchId != null} onOpenChange={o => { if (!o) setDetailBatchId(null); }} />

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={open => setEditDialog({ open, batch: open ? editDialog.batch : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑批次</DialogTitle>
            <DialogDescription>{editDialog.batch?.batchCode}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>总成本</Label><Input type="number" value={editForm.totalCost} onChange={e => setEditForm(f => ({ ...f, totalCost: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-1"><Label>数量</Label><Input type="number" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} /></div>
            <div className="space-y-1"><Label>采购日期</Label><Input type="date" value={editForm.purchaseDate} onChange={e => setEditForm(f => ({ ...f, purchaseDate: e.target.value }))} /></div>
            <div className="space-y-1"><Label>供应商</Label><Input value={editForm.supplierName} onChange={e => setEditForm(f => ({ ...f, supplierName: e.target.value }))} placeholder="可选" /></div>
            <div className="space-y-1"><Label>备注</Label><Input value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} placeholder="可选" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, batch: null })}>取消</Button>
            <Button onClick={handleEdit} className="bg-emerald-600 hover:bg-emerald-700">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog({ open, batch: open ? deleteDialog.batch : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" />确认删除批次</DialogTitle>
            <DialogDescription>此操作不可撤销，确定要删除这个批次吗？关联的货品不会被删除。</DialogDescription>
          </DialogHeader>
          {deleteDialog.batch && (
            <div className="py-2">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm space-y-1">
                <p><span className="text-muted-foreground">批次编号:</span> <span className="font-mono">{deleteDialog.batch.batchCode}</span></p>
                <p><span className="text-muted-foreground">材质:</span> {deleteDialog.batch.materialName}</p>
                <p><span className="text-muted-foreground">总成本:</span> {formatPrice(deleteDialog.batch.totalCost)}</p>
                <p><span className="text-muted-foreground">已录入:</span> {deleteDialog.batch.itemsCount || 0}/{deleteDialog.batch.quantity} 件</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, batch: null })}>取消</Button>
            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700">确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BatchesTab;
