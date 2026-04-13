'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { itemsApi, salesApi, dictsApi, exportApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge, EmptyState, LoadingSkeleton } from './shared';
import ItemCreateDialog from './item-create-dialog';
import ItemDetailDialog from './item-detail-dialog';
import ItemEditDialog from './item-edit-dialog';
import LabelPrintDialog from './label-print-dialog';
import BarcodeScanner from './barcode-scanner';
import { MATERIAL_CATEGORIES } from './settings-tab';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  Package, CheckCircle, DollarSign, BarChart3, Plus, Search, Eye,
  Pencil, DollarSign as DollarSignIcon, RotateCcw, Trash2, FileDown, Barcode, Printer, ArrowUpDown, ArrowUp, ArrowDown, Camera,
} from 'lucide-react';

// ========== Inventory Tab ==========
function InventoryTab() {
  const [items, setItems] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ materialCategory: '', materialId: '', status: 'in_stock', keyword: '', counter: '' });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [detailItemId, setDetailItemId] = useState<number | null>(null);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [returnConfirmItem, setReturnConfirmItem] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [saleDialog, setSaleDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [saleForm, setSaleForm] = useState({ actualPrice: 0, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' });
  const [scanSku, setScanSku] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [printLabelItem, setPrintLabelItem] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => { dictsApi.getMaterials().then(setMaterials).catch(() => {}); }, []);

  // 根据大类筛选材质
  const filteredMaterials = materials.filter((m: any) => {
    if (!filters.materialCategory) return true;
    return m.category === filters.materialCategory;
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, size: pagination.size };
      if (filters.materialId) params.material_id = filters.materialId;
      if (filters.status) params.status = filters.status;
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.counter) params.counter = filters.counter;
      params.sort_by = sortBy;
      params.sort_order = sortOrder;
      const data = await itemsApi.getItems(params);
      setItems(data.items || []);
      setPagination(data.pagination || { total: 0, page: 1, size: 20, pages: 0 });
    } catch {
      toast.error('加载库存失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filters, sortBy, sortOrder]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleSale() {
    if (!saleDialog.item) return;
    try {
      await salesApi.createSale({ itemId: saleDialog.item.id, actualPrice: saleForm.actualPrice, channel: saleForm.channel, saleDate: saleForm.saleDate, note: saleForm.note });
      toast.success('出库成功！');
      setSaleDialog({ open: false, item: null });
      fetchItems();
    } catch (e: any) { toast.error(e.message || '出库失败'); }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此货品？')) return;
    try { await itemsApi.deleteItem(id); toast.success('删除成功'); fetchItems(); } catch (e: any) { toast.error(e.message); }
  }

  async function handleReturn() {
    if (!returnConfirmItem.item) return;
    try {
      await itemsApi.updateItem(returnConfirmItem.item.id, { status: 'returned' });
      toast.success('退货成功！');
      setReturnConfirmItem({ open: false, item: null });
      fetchItems();
    } catch (e: any) { toast.error(e.message || '退货失败'); }
  }

  async function handleScanSku() {
    if (!scanSku.trim()) return;
    setScanLoading(true);
    try {
      const item = await itemsApi.lookupBySku(scanSku.trim());
      if (item.status === 'in_stock') {
        setSaleDialog({ open: true, item });
        setSaleForm({ actualPrice: item.sellingPrice, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' });
        setScanSku('');
      } else {
        toast.error(`货品 ${item.skuCode} 当前状态为「${item.status === 'sold' ? '已售' : item.status === 'returned' ? '已退' : item.status}」，无法出库`);
      }
    } catch {
      toast.error('未找到该SKU对应的货品');
    } finally {
      setScanLoading(false);
    }
  }

  async function handleBarcodeScan(code: string) {
    setShowScanner(false);
    setScanLoading(true);
    try {
      const item = await itemsApi.lookupBySku(code.trim());
      if (item.status === 'in_stock') {
        setSaleDialog({ open: true, item });
        setSaleForm({ actualPrice: item.sellingPrice, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' });
      } else {
        toast.error(`货品 ${item.skuCode} 当前状态为「${item.status === 'sold' ? '已售' : item.status === 'returned' ? '已退' : item.status}」，无法出库`);
      }
    } catch {
      toast.error(`未找到条码「${code}」对应的货品`);
    } finally {
      setScanLoading(false);
    }
  }

  function toggleSortOrder() {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  }

  if (loading && items.length === 0) return <LoadingSkeleton />;

  const totalValue = items.reduce((sum, i) => sum + (i.allocatedCost || i.estimatedCost || i.costPrice || 0), 0);

  const sortFieldLabels: Record<string, string> = {
    created_at: '入库时间',
    selling_price: '售价',
    cost_price: '成本',
    purchase_date: '采购日期',
    sku_code: 'SKU编号',
    name: '名称',
  };

  return (
    <div className="space-y-6">
      {/* Scan-to-Sell */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <Barcode className="h-4 w-4 text-emerald-600" />
            <Input
              placeholder="扫码/输入SKU快速出库"
              value={scanSku}
              onChange={e => setScanSku(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleScanSku(); }}
              className="h-9 flex-1"
              disabled={scanLoading}
            />
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={handleScanSku} disabled={scanLoading || !scanSku.trim()}>
              {scanLoading ? '查询中...' : '出库'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 md:hidden border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-3"
              onClick={() => setShowScanner(true)}
              disabled={scanLoading}
            >
              <Camera className="h-4 w-4 mr-1" /> 扫码
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 hidden md:flex border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              onClick={() => setShowScanner(true)}
              disabled={scanLoading}
              title="摄像头扫码"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-md hover:border-emerald-400 transition-all duration-200">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><Package className="h-16 w-16 text-emerald-500" /></div>
            <p className="text-sm text-muted-foreground">总库存</p><p className="text-2xl font-bold">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-sky-500 hover:shadow-md hover:border-sky-400 transition-all duration-200">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><CheckCircle className="h-16 w-16 text-sky-500" /></div>
            <p className="text-sm text-muted-foreground">在库中</p><p className="text-2xl font-bold text-emerald-600">{items.filter(i => i.status === 'in_stock').length}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-md hover:border-amber-400 transition-all duration-200">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><DollarSign className="h-16 w-16 text-amber-500" /></div>
            <p className="text-sm text-muted-foreground">库存价值</p><p className="text-2xl font-bold text-emerald-600">{formatPrice(totalValue)}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-md hover:border-purple-400 transition-all duration-200">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><BarChart3 className="h-16 w-16 text-purple-500" /></div>
            <p className="text-sm text-muted-foreground">当前页</p><p className="text-2xl font-bold">{pagination.page}/{pagination.pages || 1}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="space-y-1"><Label className="text-xs">关键词</Label><Input placeholder="SKU/名称/证书" value={filters.keyword} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">材质大类</Label>
              <Select value={filters.materialCategory} onValueChange={v => {
                const cat = v === '_all' ? '' : v;
                setFilters(f => ({ ...f, materialCategory: cat, materialId: '' }));
              }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="全部大类" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">全部大类</SelectItem>
                  {MATERIAL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">材质</Label>
              <Select value={filters.materialId} onValueChange={v => setFilters(f => ({ ...f, materialId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="全部材质" /></SelectTrigger>
                <SelectContent><SelectItem value="all">全部材质</SelectItem>{filteredMaterials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">状态</Label>
              <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">全部</SelectItem><SelectItem value="in_stock">在库</SelectItem><SelectItem value="sold">已售</SelectItem><SelectItem value="returned">已退</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">柜台</Label><Input type="number" placeholder="柜台号" value={filters.counter} onChange={e => setFilters(f => ({ ...f, counter: e.target.value }))} className="h-9" /></div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchItems(); }} className="h-9"><Search className="h-3 w-3 mr-1" />搜索</Button>
              <Button size="sm" variant="outline" onClick={() => setFilters({ materialCategory: '', materialId: '', status: 'in_stock', keyword: '', counter: '' })} className="h-9">重置</Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => setShowCreate(true)}><Plus className="h-3 w-3 mr-1" />新增入库</Button>
              <a href={exportApi.inventory()} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="h-9"><FileDown className="h-3 w-3 mr-1" />导出</Button>
              </a>
            </div>
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">排序</Label>
              <Select value={sortBy} onValueChange={v => setSortBy(v)}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(sortFieldLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={toggleSortOrder} title={sortOrder === 'desc' ? '降序' : '升序'}>
                {sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      {items.length === 0 ? (
        <EmptyState icon={Package} title="暂无货品" desc="还没有入库任何货品，点击「新增入库」开始" />
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead><TableHead>名称</TableHead><TableHead>材质</TableHead><TableHead>器型</TableHead>
                    <TableHead className="text-right">成本</TableHead><TableHead className="text-right">售价</TableHead>
                    <TableHead>状态</TableHead><TableHead>库龄</TableHead><TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs">{item.skuCode}</TableCell>
                      <TableCell>{item.name || item.skuCode}</TableCell>
                      <TableCell>{item.materialName}</TableCell>
                      <TableCell>{item.typeName || '-'}</TableCell>
                      <TableCell className="text-right">{item.allocatedCost ? formatPrice(item.allocatedCost) : item.estimatedCost ? <span className="text-muted-foreground" title="预估成本">{formatPrice(item.estimatedCost)}~</span> : formatPrice(item.costPrice)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatPrice(item.sellingPrice)}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell className={item.ageDays > 90 ? 'text-red-600 font-medium' : ''}>{item.ageDays != null ? `${item.ageDays}天` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDetailItemId(item.id)} title="查看详情"><Eye className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-sky-600" onClick={() => setPrintLabelItem(item)} title="打印标签"><Printer className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-600" onClick={() => setEditItemId(item.id)} title="编辑"><Pencil className="h-3 w-3" /></Button>
                          {item.status === 'in_stock' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={() => { setSaleDialog({ open: true, item }); setSaleForm({ actualPrice: item.sellingPrice, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' }); }}>
                              <DollarSignIcon className="h-3 w-3" /> 出库
                            </Button>
                          )}
                          {item.status === 'sold' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-600" onClick={() => setReturnConfirmItem({ open: true, item })} title="退货">
                              <RotateCcw className="h-3 w-3" /> 退货
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => handleDelete(item.id)} title="删除"><Trash2 className="h-3 w-3" /></Button>
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
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-muted-foreground">{item.skuCode}</span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="font-medium text-sm mb-1 truncate">{item.name || item.skuCode}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{item.materialName}</span>
                  <span>·</span>
                  <span>{item.typeName || '-'}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-emerald-600">{formatPrice(item.sellingPrice)}</span>
                  <span className="text-xs text-muted-foreground">{item.ageDays != null ? `${item.ageDays}天` : '-'}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setDetailItemId(item.id)}><Eye className="h-3 w-3 mr-1" />详情</Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-sky-600" onClick={() => setPrintLabelItem(item)}><Printer className="h-3 w-3 mr-1" />标签</Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-amber-600" onClick={() => setEditItemId(item.id)}><Pencil className="h-3 w-3 mr-1" />编辑</Button>
                  {item.status === 'in_stock' && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-emerald-600" onClick={() => { setSaleDialog({ open: true, item }); setSaleForm({ actualPrice: item.sellingPrice, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' }); }}>
                      <DollarSignIcon className="h-3 w-3 mr-1" />出库
                    </Button>
                  )}
                  {item.status === 'sold' && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-orange-600" onClick={() => setReturnConfirmItem({ open: true, item })}>
                      <RotateCcw className="h-3 w-3 mr-1" />退货
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>上一页</Button>
          <span className="text-sm text-muted-foreground">{pagination.page} / {pagination.pages}</span>
          <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>下一页</Button>
        </div>
      )}

      {/* Sale Dialog */}
      <Dialog open={saleDialog.open} onOpenChange={open => setSaleDialog({ open, item: open ? saleDialog.item : null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>销售出库</DialogTitle><DialogDescription>货品: {saleDialog.item?.skuCode} - {saleDialog.item?.name || saleDialog.item?.skuCode}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>成交价</Label><Input type="number" value={saleForm.actualPrice} onChange={e => setSaleForm(f => ({ ...f, actualPrice: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-1"><Label>销售渠道</Label>
              <Select value={saleForm.channel} onValueChange={v => setSaleForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="store">门店</SelectItem><SelectItem value="wechat">微信</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>销售日期</Label><Input type="date" value={saleForm.saleDate} onChange={e => setSaleForm(f => ({ ...f, saleDate: e.target.value }))} /></div>
            <div className="space-y-1"><Label>备注</Label><Textarea value={saleForm.note} onChange={e => setSaleForm(f => ({ ...f, note: e.target.value }))} placeholder="可选" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleDialog({ open: false, item: null })}>取消</Button>
            <Button onClick={handleSale} className="bg-emerald-600 hover:bg-emerald-700">确认出库</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Create Dialog */}
      <ItemCreateDialog open={showCreate} onOpenChange={setShowCreate} onSuccess={fetchItems} />

      {/* Item Detail Dialog */}
      <ItemDetailDialog itemId={detailItemId} open={detailItemId !== null} onOpenChange={open => { if (!open) setDetailItemId(null); }} />

      {/* Item Edit Dialog */}
      <ItemEditDialog itemId={editItemId} open={editItemId !== null} onOpenChange={open => { if (!open) setEditItemId(null); }} onSuccess={fetchItems} />

      {/* Return Confirmation Dialog */}
      <Dialog open={returnConfirmItem.open} onOpenChange={open => setReturnConfirmItem({ open, item: open ? returnConfirmItem.item : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认退货</DialogTitle>
            <DialogDescription>确定将此货品标记为退货？</DialogDescription>
          </DialogHeader>
          {returnConfirmItem.item && (
            <div className="py-2">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{returnConfirmItem.item.skuCode}</span></p>
                <p><span className="text-muted-foreground">名称:</span> {returnConfirmItem.item.name || returnConfirmItem.item.skuCode}</p>
                <p><span className="text-muted-foreground">售价:</span> <span className="font-medium text-emerald-600">{formatPrice(returnConfirmItem.item.sellingPrice)}</span></p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnConfirmItem({ open: false, item: null })}>取消</Button>
            <Button onClick={handleReturn} className="bg-orange-600 hover:bg-orange-700">确认退货</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Label Print Dialog */}
      <LabelPrintDialog item={printLabelItem} open={printLabelItem !== null} onOpenChange={open => { if (!open) setPrintLabelItem(null); }} />

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner open={showScanner} onClose={() => setShowScanner(false)} onScan={handleBarcodeScan} />
    </div>
  );
}

export default InventoryTab;
