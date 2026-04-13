'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { itemsApi, salesApi, dictsApi, batchesApi, exportApi } from '@/lib/api';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { formatPrice, StatusBadge, EmptyState, LoadingSkeleton, ConfirmDialog } from './shared';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Package, CheckCircle, DollarSign, BarChart3, Plus, Search, Eye,
  Pencil, DollarSign as DollarSignIcon, RotateCcw, Trash2, FileDown, Barcode, Printer, ArrowUp, ArrowDown, ArrowUpDown, Camera, Layers,
  ShoppingCart, Tag, MapPin, X, Gem, CheckSquare,
} from 'lucide-react';

// ========== Active Filter Tags Component ==========
function ActiveFilterTags({ filters, materials, allBatches, onClearAll, onClear }: {
  filters: { materialCategory: string; materialId: string; status: string; keyword: string; counter: string; batchId: string };
  materials: any[];
  allBatches: any[];
  onClearAll: () => void;
  onClear: (key: string) => void;
}) {
  // Build active tags
  const tags: { key: string; label: string }[] = [];
  if (filters.keyword) tags.push({ key: 'keyword', label: `关键词: ${filters.keyword}` });
  if (filters.materialCategory) {
    const cat = MATERIAL_CATEGORIES.find(c => c.value === filters.materialCategory);
    tags.push({ key: 'materialCategory', label: cat?.label || filters.materialCategory });
  }
  if (filters.materialId) {
    const mat = materials.find((m: any) => String(m.id) === filters.materialId);
    tags.push({ key: 'materialId', label: mat?.name || filters.materialId });
  }
  if (filters.status && filters.status !== 'in_stock') {
    const statusLabels: Record<string, string> = { in_stock: '在库', sold: '已售', returned: '已退' };
    tags.push({ key: 'status', label: statusLabels[filters.status] || filters.status });
  }
  if (filters.counter) tags.push({ key: 'counter', label: `${filters.counter}号柜` });
  if (filters.batchId) {
    const batch = allBatches.find((b: any) => String(b.id) === filters.batchId);
    tags.push({ key: 'batchId', label: batch?.batchCode || filters.batchId });
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-3 flex-wrap animate-in fade-in-0 slide-in-from-top-1 duration-200">
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs px-2 py-0.5">
        筛选中 ({tags.length})
      </Badge>
      {tags.map(tag => (
        <button
          key={tag.key}
          onClick={() => onClear(tag.key)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted/80 hover:bg-muted text-foreground transition-colors group"
        >
          <span>{tag.label}</span>
          <X className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
      >
        清除全部
      </button>
    </div>
  );
}

// ========== Inventory Tab ==========
function InventoryTab() {
  const { setActiveTab } = useAppStore();
  const [items, setItems] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [allBatches, setAllBatches] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ materialCategory: '', materialId: '', status: 'in_stock', keyword: '', counter: '', batchId: '' });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  // Batch operation dialogs
  const [batchSellOpen, setBatchSellOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchPriceOpen, setBatchPriceOpen] = useState(false);
  const [batchCounterOpen, setBatchCounterOpen] = useState(false);

  // Batch sell form
  const [batchSellForm, setBatchSellForm] = useState({ channel: 'store', saleDate: new Date().toISOString().slice(0, 10), useCurrentPrice: true });

  // Batch price adjust form
  const [batchPriceForm, setBatchPriceForm] = useState({ mode: 'percent', target: 'sellingPrice', value: '' });

  // Batch counter form
  const [batchCounterForm, setBatchCounterForm] = useState({ counter: '' });

  // Batch operation loading state
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Batch sell individual prices
  const [batchSellPrices, setBatchSellPrices] = useState<Record<number, number>>({});

  // Delete confirmation dialog
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any>(null);

  useEffect(() => { dictsApi.getMaterials().then(setMaterials).catch(() => {}); }, []);
  useEffect(() => { batchesApi.getBatches({ page: 1, size: 1000 }).then(d => setAllBatches(d.items || [])).catch(() => {}); }, []);

  // 根据大类筛选材质
  const filteredMaterials = materials.filter((m: any) => {
    if (!filters.materialCategory) return true;
    return m.category === filters.materialCategory;
  });

  // Selected items (memoized)
  const selectedItems = useMemo(() => items.filter(i => selectedIds.has(i.id)), [items, selectedIds]);

  // Only in_stock items among selected
  const selectedInStockItems = useMemo(() => selectedItems.filter(i => i.status === 'in_stock'), [selectedItems]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, size: pagination.size };
      if (filters.materialId) params.material_id = filters.materialId;
      if (filters.status) params.status = filters.status;
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.counter) params.counter = filters.counter;
      if (filters.batchId) params.batch_id = filters.batchId;
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

  // Clear selection when page/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [pagination.page, filters, sortBy, sortOrder]);

  // Selection handlers
  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

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
    const item = items.find(i => i.id === id);
    if (!item) return;
    setDeleteConfirmItem(item);
  }

  async function confirmDelete() {
    if (!deleteConfirmItem) return;
    try {
      await itemsApi.deleteItem(deleteConfirmItem.id);
      toast.success('删除成功');
      setDeleteConfirmItem(null);
      fetchItems();
    } catch (e: any) {
      toast.error(e.message || '删除失败');
    }
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

  // ========== CSV Export ==========
  function handleExportCSV() {
    if (items.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }
    const statusMap: Record<string, string> = { in_stock: '在库', sold: '已售', returned: '已退' };
    const header = 'SKU,名称,器型,材质,状态,成本,售价,采购日期,柜台号';
    const rows = items.map(item => {
      const name = item.name || item.skuCode;
      const typeName = item.typeName || '';
      const materialName = item.materialName || '';
      const status = statusMap[item.status] || item.status;
      const cost = item.allocatedCost || item.estimatedCost || item.costPrice || 0;
      const sellingPrice = item.sellingPrice || 0;
      const purchaseDate = item.purchaseDate || '';
      const counter = item.counter || '';
      // Escape commas/quotes in CSV
      const escape = (v: string) => {
        if (v.includes(',') || v.includes('"') || v.includes('\n')) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      };
      return [item.skuCode, escape(name), escape(typeName), escape(materialName), status, cost, sellingPrice, purchaseDate, counter].join(',');
    });
    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `库存数据_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${items.length} 条库存数据`);
  }

  // ========== Batch Operations ==========

  async function handleBatchSell() {
    if (selectedInStockItems.length === 0) {
      toast.error('没有可出库的在库货品');
      return;
    }
    setBatchLoading(true);
    setBatchProgress({ current: 0, total: selectedInStockItems.length });
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < selectedInStockItems.length; i++) {
      const item = selectedInStockItems[i];
      setBatchProgress({ current: i + 1, total: selectedInStockItems.length });
      try {
        const price = batchSellForm.useCurrentPrice
          ? item.sellingPrice
          : (batchSellPrices[item.id] ?? item.sellingPrice);
        await salesApi.createSale({
          itemId: item.id,
          actualPrice: price,
          channel: batchSellForm.channel,
          saleDate: batchSellForm.saleDate,
          note: '批量出库',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBatchLoading(false);
    setBatchProgress(null);
    setBatchSellOpen(false);
    setBatchSellPrices({});
    clearSelection();
    fetchItems();
    if (failCount === 0) {
      toast.success(`批量出库成功！共 ${successCount} 件`);
    } else {
      toast.warning(`批量出库完成：成功 ${successCount} 件，失败 ${failCount} 件`);
    }
  }

  async function handleBatchDelete() {
    setBatchLoading(true);
    setBatchProgress({ current: 0, total: selectedItems.length });
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setBatchProgress({ current: i + 1, total: selectedItems.length });
      try {
        await itemsApi.deleteItem(item.id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBatchLoading(false);
    setBatchProgress(null);
    setBatchDeleteOpen(false);
    clearSelection();
    fetchItems();
    if (failCount === 0) {
      toast.success(`批量删除成功！共 ${successCount} 件`);
    } else {
      toast.warning(`批量删除完成：成功 ${successCount} 件，失败 ${failCount} 件`);
    }
  }

  async function handleBatchPriceAdjust() {
    const adjustValue = parseFloat(batchPriceForm.value);
    if (isNaN(adjustValue)) {
      toast.error('请输入有效的调整值');
      return;
    }
    setBatchLoading(true);
    setBatchProgress({ current: 0, total: selectedItems.length });
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setBatchProgress({ current: i + 1, total: selectedItems.length });
      try {
        const updateData: any = {};
        if (batchPriceForm.target === 'sellingPrice') {
          const oldPrice = item.sellingPrice || 0;
          const newPrice = batchPriceForm.mode === 'percent'
            ? Math.round(oldPrice * (1 + adjustValue / 100))
            : Math.round(oldPrice + adjustValue);
          if (newPrice < 0) { failCount++; continue; }
          updateData.sellingPrice = newPrice;
        } else {
          const oldPrice = item.minimumPrice || 0;
          const newPrice = batchPriceForm.mode === 'percent'
            ? Math.round(oldPrice * (1 + adjustValue / 100))
            : Math.round(oldPrice + adjustValue);
          if (newPrice < 0) { failCount++; continue; }
          updateData.minimumPrice = newPrice;
        }
        await itemsApi.updateItem(item.id, updateData);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBatchLoading(false);
    setBatchProgress(null);
    setBatchPriceOpen(false);
    setBatchPriceForm({ mode: 'percent', target: 'sellingPrice', value: '' });
    clearSelection();
    fetchItems();
    if (failCount === 0) {
      toast.success(`批量调价成功！共 ${successCount} 件`);
    } else {
      toast.warning(`批量调价完成：成功 ${successCount} 件，失败 ${failCount} 件`);
    }
  }

  async function handleBatchCounter() {
    const counter = parseInt(batchCounterForm.counter);
    if (isNaN(counter)) {
      toast.error('请输入有效的柜台号');
      return;
    }
    setBatchLoading(true);
    setBatchProgress({ current: 0, total: selectedItems.length });
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setBatchProgress({ current: i + 1, total: selectedItems.length });
      try {
        await itemsApi.updateItem(item.id, { counter: String(counter) });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBatchLoading(false);
    setBatchProgress(null);
    setBatchCounterOpen(false);
    setBatchCounterForm({ counter: '' });
    clearSelection();
    fetchItems();
    if (failCount === 0) {
      toast.success(`批量修改柜台成功！共 ${successCount} 件`);
    } else {
      toast.warning(`批量修改柜台完成：成功 ${successCount} 件，失败 ${failCount} 件`);
    }
  }

  // Price preview for batch adjust
  const pricePreview = useMemo(() => {
    const adjustValue = parseFloat(batchPriceForm.value);
    if (isNaN(adjustValue)) return [];
    return selectedItems.slice(0, 10).map(item => {
      const field = batchPriceForm.target === 'sellingPrice' ? 'sellingPrice' : 'minimumPrice';
      const oldPrice = item[field] || 0;
      const newPrice = batchPriceForm.mode === 'percent'
        ? Math.round(oldPrice * (1 + adjustValue / 100))
        : Math.round(oldPrice + adjustValue);
      return { id: item.id, name: item.name || item.skuCode, sku: item.skuCode, oldPrice, newPrice };
    });
  }, [selectedItems, batchPriceForm]);

  // Client-side sort for table display
  const sortedItems = useMemo(() => {
    if (!items.length) return items;
    const sorted = [...items];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'selling_price':
          cmp = (a.sellingPrice || 0) - (b.sellingPrice || 0);
          break;
        case 'cost_price':
          cmp = (a.allocatedCost || a.estimatedCost || a.costPrice || 0) - (b.allocatedCost || b.estimatedCost || b.costPrice || 0);
          break;
        case 'purchase_date':
          cmp = (a.purchaseDate || '').localeCompare(b.purchaseDate || '');
          break;
        case 'sku_code':
          cmp = (a.skuCode || '').localeCompare(b.skuCode || '');
          break;
        case 'name':
          cmp = (a.name || a.skuCode || '').localeCompare(b.name || b.skuCode || '');
          break;
        case 'created_at':
        default:
          cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [items, sortBy, sortOrder]);

  function SortableHead({ field, children, align }: { field: string; children: React.ReactNode; align?: 'left' | 'right' }) {
    const isActive = sortBy === field;
    return (
      <TableHead
        className={`${align === 'right' ? 'text-right' : ''} cursor-pointer select-none hover:bg-muted/50 transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
        onClick={() => {
          if (sortBy === field) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
          } else {
            setSortBy(field);
            setSortOrder('desc');
          }
        }}
      >
        <div className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          {children}
          {isActive ? (
            sortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </div>
      </TableHead>
    );
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

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

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
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div className="space-y-1 relative">
              <Label className="text-xs">关键词</Label>
              <div className="relative">
                <Input placeholder="SKU/名称/证书" value={filters.keyword} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} className="h-9 pr-8" />
                {filters.keyword && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      setFilters(f => ({ ...f, keyword: '' }));
                      const input = document.querySelector('input[placeholder*="SKU"]') as HTMLInputElement;
                      if (input) input.focus();
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">材质大类</Label>
              <Select value={filters.materialCategory || '_all'} onValueChange={v => {
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
              <Select value={filters.materialId || 'all'} onValueChange={v => setFilters(f => ({ ...f, materialId: v === 'all' ? '' : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="全部材质" /></SelectTrigger>
                <SelectContent><SelectItem value="all">全部材质</SelectItem>{filteredMaterials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">状态</Label>
              <Select value={filters.status || 'all'} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">全部</SelectItem><SelectItem value="in_stock">在库</SelectItem><SelectItem value="sold">已售</SelectItem><SelectItem value="returned">已退</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1 hidden md:block"><Label className="text-xs">快捷筛选</Label>
              <div className="flex items-center gap-1">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'in_stock', label: '在库' },
                  { key: 'sold', label: '已售' },
                  { key: 'returned', label: '已退' },
                ].map(s => (
                  <Button
                    key={s.key}
                    size="sm"
                    variant={filters.status === s.key ? 'default' : 'outline'}
                    className={`h-8 text-xs px-2.5 rounded-full ${filters.status === s.key ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 border-0' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, status: s.key }))}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">柜台</Label><Input type="number" placeholder="柜台号" value={filters.counter} onChange={e => setFilters(f => ({ ...f, counter: e.target.value }))} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">批次</Label>
              <Select value={filters.batchId || 'all'} onValueChange={v => setFilters(f => ({ ...f, batchId: v === 'all' ? '' : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="全部批次" /></SelectTrigger>
                <SelectContent><SelectItem value="all">全部批次</SelectItem>{allBatches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.batchCode}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchItems(); }} className="h-9"><Search className="h-3 w-3 mr-1" />搜索</Button>
              <Button size="sm" variant="outline" onClick={() => setFilters({ materialCategory: '', materialId: '', status: 'in_stock', keyword: '', counter: '', batchId: '' })} className="h-9">重置</Button>
            </div>
          </div>
          {/* Active filter tags */}
          <ActiveFilterTags filters={filters} materials={materials} allBatches={allBatches} onClearAll={() => setFilters({ materialCategory: '', materialId: '', status: 'in_stock', keyword: '', counter: '', batchId: '' })} onClear={(key: string) => setFilters(f => ({ ...f, [key]: key === 'status' ? 'in_stock' : '' }))} />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => setShowCreate(true)}><Plus className="h-3 w-3 mr-1" />新增入库</Button>
              <Button size="sm" variant="outline" className="h-9" onClick={handleExportCSV} disabled={items.length === 0}><FileDown className="h-3 w-3 mr-1" />导出CSV</Button>
              <a href={exportApi.inventory()} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="h-9">完整导出</Button>
              </a>
              {/* Mobile Select All */}
              <Button size="sm" variant="outline" className="h-9 md:hidden" onClick={toggleSelectAll}>
                <CheckSquare className="h-3 w-3 mr-1" />
                {isAllSelected ? '取消全选' : '选择全部'}
              </Button>
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
                    <TableHead className="w-10 px-3">
                      <Checkbox
                        checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleSelectAll}
                        className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary"
                      />
                    </TableHead>
                    <TableHead className="w-12 px-2">图</TableHead>
                    <SortableHead field="sku_code">SKU</SortableHead>
                    <SortableHead field="name">名称</SortableHead>
                    <TableHead>材质</TableHead><TableHead>器型</TableHead><TableHead>所属批次</TableHead>
                    <SortableHead field="cost_price" align="right">成本</SortableHead>
                    <SortableHead field="selling_price" align="right">售价</SortableHead>
                    <SortableHead field="purchase_date">采购日期</SortableHead>
                    <TableHead>状态</TableHead><TableHead>库龄</TableHead><TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item, idx) => (
                    <TableRow key={item.id} className={`group hover:bg-muted/50 transition-all duration-150 border-l-2 border-l-transparent hover:border-l-emerald-400 ${idx % 2 === 1 ? 'even:bg-muted/20' : ''} ${selectedIds.has(item.id) ? 'bg-emerald-50 dark:bg-emerald-950/20 hover:border-l-emerald-500' : item.status === 'sold' ? 'hover:border-l-gray-400' : item.status === 'returned' ? 'hover:border-l-red-400' : ''}`}>
                      <TableCell className="w-10 px-3">
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="w-12 px-2">
                        {item.coverImage ? (
                          <img src={item.coverImage} alt="" className="w-10 h-10 rounded-md object-cover aspect-square bg-muted" loading="lazy" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                            <Gem className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.skuCode}</TableCell>
                      <TableCell>{item.name || item.skuCode}</TableCell>
                      <TableCell>{item.materialName}</TableCell>
                      <TableCell>{item.typeName || '-'}</TableCell>
                      <TableCell>{item.batchCode ? (
                        <Badge variant="outline" className="cursor-pointer hover:bg-muted font-mono text-xs" onClick={() => { setActiveTab('batches'); }} title="点击查看批次详情">
                          <Layers className="h-2.5 w-2.5 mr-1" />{item.batchCode}
                        </Badge>
                      ) : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right">{item.allocatedCost ? formatPrice(item.allocatedCost) : item.estimatedCost ? <span className="text-muted-foreground" title="预估成本">{formatPrice(item.estimatedCost)}~</span> : formatPrice(item.costPrice)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatPrice(item.sellingPrice)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.purchaseDate || '-'}</TableCell>
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
          {sortedItems.map(item => (
            <Card key={item.id} className={`hover:shadow-md transition-shadow ${selectedIds.has(item.id) ? 'ring-2 ring-emerald-400/50 bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
              <CardContent className="p-4 space-y-3">
                {/* Header: Thumbnail + Checkbox + SKU + Status */}
                <div className="flex items-center gap-3">
                  {item.coverImage ? (
                    <img src={item.coverImage} alt="" className="w-12 h-12 rounded-md object-cover aspect-square bg-muted shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Gem className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                      <span className="font-mono text-xs text-muted-foreground truncate">{item.skuCode}</span>
                    </div>
                    <p className="font-medium text-sm truncate mt-0.5">{item.name || item.skuCode}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                {/* Material + Type + Batch */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                  <span>{item.materialName}</span>
                  <span>·</span>
                  <span>{item.typeName || '-'}</span>
                  {item.batchCode && (
                    <>
                      <span>·</span>
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 cursor-pointer hover:bg-muted" onClick={() => setActiveTab('batches')}>
                        <Layers className="h-2 w-2 mr-0.5" />{item.batchCode}
                      </Badge>
                    </>
                  )}
                </div>
                {/* Price row: cost + selling + age */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-emerald-600">{formatPrice(item.sellingPrice)}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.allocatedCost
                        ? formatPrice(item.allocatedCost)
                        : item.estimatedCost
                          ? <span className="text-muted-foreground">{formatPrice(item.estimatedCost)}~</span>
                          : formatPrice(item.costPrice)}
                    </span>
                  </div>
                  <span className={`text-xs ${item.ageDays != null && item.ageDays > 90 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>{item.ageDays != null ? `${item.ageDays}天` : '-'}</span>
                </div>
                {/* Action buttons */}
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

      {/* Floating Bulk Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-30 bg-emerald-600 dark:bg-emerald-700 shadow-lg animate-in slide-in-from-bottom-2 duration-200">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white whitespace-nowrap">
              已选择 <span className="font-bold text-white">{selectedIds.size}</span> 件货品
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="h-7 bg-white text-emerald-700 hover:bg-emerald-50"
                onClick={() => setBatchSellOpen(true)}
                disabled={selectedInStockItems.length === 0}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />批量出库
              </Button>
              <Button
                size="sm"
                className="h-7 bg-white/15 text-white hover:bg-white/25 border border-white/30"
                onClick={() => setBatchDeleteOpen(true)}
              >
                <Trash2 className="h-3 w-3 mr-1" />批量删除
              </Button>
              <Button
                size="sm"
                className="h-7 bg-white/15 text-white hover:bg-white/25 border border-white/30"
                onClick={() => setBatchPriceOpen(true)}
              >
                <Tag className="h-3 w-3 mr-1" />批量调价
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-white/80 hover:text-white hover:bg-white/10"
                onClick={clearSelection}
              >
                取消选择
              </Button>
            </div>
          </div>
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

      {/* Batch Sell Dialog */}
      <Dialog open={batchSellOpen} onOpenChange={setBatchSellOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              批量出库
            </DialogTitle>
            <DialogDescription>将选中的在库货品批量出库销售</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Progress indicator */}
            {batchProgress && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>处理进度</span>
                  <span>{batchProgress.current} / {batchProgress.total}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
            {/* Selected items list */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">选中货品（{selectedInStockItems.length} 件可出库）</Label>
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {selectedItems.map(item => (
                    <div key={item.id} className={`flex items-center justify-between text-sm py-1 px-2 rounded ${item.status === 'in_stock' ? 'bg-muted/50' : 'bg-muted/20 opacity-50'}`}>
                      <span className="font-mono text-xs">{item.skuCode}</span>
                      <span className="truncate mx-2 text-xs">{item.name || item.skuCode}</span>
                      {!batchSellForm.useCurrentPrice && item.status === 'in_stock' ? (
                        <Input
                          type="number"
                          className="h-7 w-24 text-xs text-right"
                          value={batchSellPrices[item.id] ?? item.sellingPrice}
                          onChange={e => setBatchSellPrices(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                          disabled={batchLoading}
                        />
                      ) : (
                        <span className="font-medium text-emerald-600 whitespace-nowrap">{formatPrice(item.sellingPrice)}</span>
                      )}
                      {item.status !== 'in_stock' && <span className="text-xs text-red-500 ml-1">(非在库)</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            {/* Common fields */}
            <div className="space-y-1">
              <Label>销售渠道</Label>
              <Select value={batchSellForm.channel} onValueChange={v => setBatchSellForm(f => ({ ...f, channel: v }))} disabled={batchLoading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="store">门店</SelectItem><SelectItem value="wechat">微信</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>销售日期</Label>
              <Input type="date" value={batchSellForm.saleDate} onChange={e => setBatchSellForm(f => ({ ...f, saleDate: e.target.value }))} disabled={batchLoading} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="useCurrentPrice"
                checked={batchSellForm.useCurrentPrice}
                onCheckedChange={(checked) => {
                  setBatchSellForm(f => ({ ...f, useCurrentPrice: !!checked }));
                  if (checked) setBatchSellPrices({});
                }}
                disabled={batchLoading}
              />
              <Label htmlFor="useCurrentPrice" className="text-sm cursor-pointer">使用当前售价作为成交价</Label>
            </div>
            {selectedInStockItems.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-sm">
                <p className="text-muted-foreground">预计总营收：</p>
                <p className="text-lg font-bold text-emerald-600">
                  {formatPrice(selectedInStockItems.reduce((sum, i) => {
                    if (batchSellForm.useCurrentPrice) return sum + (i.sellingPrice || 0);
                    return sum + (batchSellPrices[i.id] ?? (i.sellingPrice || 0));
                  }, 0))}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchSellOpen(false)} disabled={batchLoading}>取消</Button>
            <Button onClick={handleBatchSell} disabled={batchLoading || selectedInStockItems.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
              {batchLoading ? `处理中 ${batchProgress ? `${batchProgress.current}/${batchProgress.total}` : '...'}` : `确认出库 ${selectedInStockItems.length} 件`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirmation */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              批量删除确认
            </AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除选中的 <span className="text-red-600 font-bold">{selectedIds.size}</span> 件货品，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Progress indicator */}
          {batchProgress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>删除进度</span>
                <span>{batchProgress.current} / {batchProgress.total}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <ScrollArea className="max-h-48">
            <div className="space-y-1 py-2">
              {selectedItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-red-50 dark:bg-red-950/20">
                  <span className="font-mono text-xs">{item.skuCode}</span>
                  <span className="truncate mx-2 text-xs">{item.name || item.skuCode}</span>
                  <span className="font-medium whitespace-nowrap">{formatPrice(item.sellingPrice)}</span>
                </div>
              ))}
              {selectedItems.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">等 {selectedItems.length} 件</p>
              )}
            </div>
          </ScrollArea>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setBatchDeleteOpen(false)} disabled={batchLoading}>取消</Button>
            <Button onClick={handleBatchDelete} disabled={batchLoading} className="bg-red-600 hover:bg-red-700">
              {batchLoading ? `删除中 ${batchProgress ? `${batchProgress.current}/${batchProgress.total}` : '...'}` : `确认删除 ${selectedIds.size} 件`}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Price Adjust Dialog */}
      <Dialog open={batchPriceOpen} onOpenChange={setBatchPriceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-amber-600" />
              批量调价
            </DialogTitle>
            <DialogDescription>对选中的 {selectedIds.size} 件货品进行价格调整</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Progress indicator */}
            {batchProgress && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>调价进度</span>
                  <span>{batchProgress.current} / {batchProgress.total}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">调整方式</Label>
                <Select value={batchPriceForm.mode} onValueChange={v => setBatchPriceForm(f => ({ ...f, mode: v }))} disabled={batchLoading}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">百分比 (%)</SelectItem>
                    <SelectItem value="fixed">固定金额 (元)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">调整对象</Label>
                <Select value={batchPriceForm.target} onValueChange={v => setBatchPriceForm(f => ({ ...f, target: v }))} disabled={batchLoading}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sellingPrice">售价</SelectItem>
                    <SelectItem value="minimumPrice">底价</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                调整值 {batchPriceForm.mode === 'percent' ? '(正数涨, 负数降, 如 +10 或 -5)' : '(正数加, 负数减, 如 500 或 -200)'}
              </Label>
              <Input
                type="number"
                placeholder={batchPriceForm.mode === 'percent' ? '如 +10 表示涨10%' : '如 500 表示加500元'}
                value={batchPriceForm.value}
                onChange={e => setBatchPriceForm(f => ({ ...f, value: e.target.value }))}
                disabled={batchLoading}
              />
            </div>
            {/* Preview */}
            {pricePreview.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">价格预览（前10件）</Label>
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {pricePreview.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-amber-50 dark:bg-amber-950/20">
                        <span className="text-xs truncate mr-2">{p.sku}</span>
                        <span className="text-muted-foreground">{formatPrice(p.oldPrice)}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span className={`font-medium ${p.newPrice >= p.oldPrice ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(p.newPrice)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedItems.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">...还有 {selectedItems.length - 10} 件</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBatchPriceOpen(false); setBatchPriceForm({ mode: 'percent', target: 'sellingPrice', value: '' }); }} disabled={batchLoading}>取消</Button>
            <Button onClick={handleBatchPriceAdjust} disabled={batchLoading || !batchPriceForm.value} className="bg-amber-600 hover:bg-amber-700 text-white">
              {batchLoading ? `调价中 ${batchProgress ? `${batchProgress.current}/${batchProgress.total}` : '...'}` : '确认调价'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Change Counter Dialog */}
      <Dialog open={batchCounterOpen} onOpenChange={setBatchCounterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-sky-600" />
              批量修改柜台
            </DialogTitle>
            <DialogDescription>将选中的 {selectedIds.size} 件货品统一修改到指定柜台</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Progress indicator */}
            {batchProgress && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>修改进度</span>
                  <span>{batchProgress.current} / {batchProgress.total}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full transition-all duration-300" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>新柜台号</Label>
              <Input
                type="number"
                placeholder="输入柜台号"
                value={batchCounterForm.counter}
                onChange={e => setBatchCounterForm(f => ({ ...f, counter: e.target.value }))}
                disabled={batchLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBatchCounterOpen(false); setBatchCounterForm({ counter: '' }); }} disabled={batchLoading}>取消</Button>
            <Button onClick={handleBatchCounter} disabled={batchLoading || !batchCounterForm.counter} className="bg-sky-600 hover:bg-sky-700 text-white">
              {batchLoading ? `修改中 ${batchProgress ? `${batchProgress.current}/${batchProgress.total}` : '...'}` : '确认修改'}
            </Button>
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

      {/* Single Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmItem !== null}
        onOpenChange={open => { if (!open) setDeleteConfirmItem(null); }}
        title="确认删除"
        description={deleteConfirmItem
          ? `此操作不可撤销，确定要删除货品「${deleteConfirmItem.name || deleteConfirmItem.skuCode}」(${deleteConfirmItem.skuCode})吗？`
          : ''}
        confirmText="确认删除"
        variant="destructive"
        onConfirm={confirmDelete}
      />

      {/* Label Print Dialog */}
      <LabelPrintDialog item={printLabelItem} open={printLabelItem !== null} onOpenChange={open => { if (!open) setPrintLabelItem(null); }} />

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner open={showScanner} onClose={() => setShowScanner(false)} onScan={handleBarcodeScan} />
    </div>
  );
}

export default InventoryTab;
