'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, TabId } from '@/lib/store';
import { dashboardApi, itemsApi, salesApi, batchesApi, customersApi, suppliersApi, dictsApi, configApi, metalApi } from '@/lib/api';
import { toast } from 'sonner';

// shadcn/ui imports
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

// Icons
import {
  LayoutDashboard, Package, ShoppingCart, Layers, Users, Settings,
  Plus, Search, Download, RefreshCw, TrendingUp, TrendingDown, DollarSign,
  BarChart3, PieChart, AlertTriangle, CheckCircle, XCircle, Eye,
  Trash2, Edit, ArrowRight, ChevronDown, Scan, Tag, Gem, Factory
} from 'lucide-react';

// Charts
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';

// ========== Shared Components ==========
const CHART_COLORS = ['#059669', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1', '#ec4899', '#84cc16', '#f97316'];

function formatPrice(v: number | null | undefined) {
  if (v == null) return '¥0.00';
  return `¥${v.toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    in_stock: { label: '在库', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
    sold: { label: '已售', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
    returned: { label: '已退', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    new: { label: '未开始', className: 'bg-gray-100 text-gray-700' },
    selling: { label: '销售中', className: 'bg-sky-100 text-sky-800' },
    paid_back: { label: '已回本', className: 'bg-emerald-100 text-emerald-800' },
    cleared: { label: '清仓完毕', className: 'bg-emerald-100 text-emerald-800' },
  };
  const info = map[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return <Badge variant="secondary" className={info.className}>{info.label}</Badge>;
}

function PaybackBar({ rate }: { rate: number }) {
  const pct = Math.min(rate * 100, 100);
  const color = rate >= 1 ? 'bg-emerald-500' : 'bg-sky-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-12 text-right">{(rate * 100).toFixed(1)}%</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-muted-foreground/40" />
      <h3 className="mt-2 text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ========== Dashboard Tab ==========
function DashboardTab() {
  const [summary, setSummary] = useState<any>(null);
  const [batchProfit, setBatchProfit] = useState<any[]>([]);
  const [profitByCategory, setProfitByCategory] = useState<any[]>([]);
  const [profitByChannel, setProfitByChannel] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [stockAging, setStockAging] = useState<any>({ items: [], totalItems: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);
  const [minDays, setMinDays] = useState(90);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, bp, pc, pch, t, sa] = await Promise.all([
        dashboardApi.getSummary({ aging_days: minDays }),
        dashboardApi.getBatchProfit({}),
        dashboardApi.getProfitByCategory({}),
        dashboardApi.getProfitByChannel({}),
        dashboardApi.getTrend({ months: 12 }),
        dashboardApi.getStockAging({ min_days: minDays }),
      ]);
      setSummary(s);
      setBatchProfit(bp || []);
      setProfitByCategory(pc || []);
      setProfitByChannel(pch || []);
      setTrend(t || []);
      setStockAging(sa || { items: [], totalItems: 0, totalValue: 0 });
    } catch (e: any) {
      toast.error('加载看板数据失败');
    } finally {
      setLoading(false);
    }
  }, [minDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSkeleton />;

  const channelLabelMap: Record<string, string> = { store: '门店', wechat: '微信' };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">在库货品</p>
              <p className="text-2xl font-bold mt-1">{summary.totalItems}</p>
              <p className="text-xs text-muted-foreground mt-1">占用资金 {formatPrice(summary.totalStockValue)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-sky-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">本月销售</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPrice(summary.monthRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.monthSoldCount} 件，毛利 {formatPrice(summary.monthProfit)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">压货预警</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stockAging.totalItems || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">超过 {minDays} 天未售</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">已回本批次</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {batchProfit.filter(b => b.status === 'paid_back' || b.status === 'cleared').length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">共 {batchProfit.length} 个批次</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Profit Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">按品类利润统计</CardTitle>
          </CardHeader>
          <CardContent>
            {profitByCategory.length === 0 ? (
              <EmptyState icon={BarChart3} title="暂无数据" desc="还没有销售记录" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[...profitByCategory].sort((a, b) => b.profit - a.profit)} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} />
                  <YAxis type="category" dataKey="materialName" width={56} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Bar dataKey="profit" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Channel Profit Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">按渠道利润</CardTitle>
          </CardHeader>
          <CardContent>
            {profitByChannel.length === 0 ? (
              <EmptyState icon={PieChart} title="暂无数据" desc="还没有渠道数据" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie
                    data={profitByChannel.map(d => ({ ...d, channelLabel: channelLabelMap[d.channel] || d.channel }))}
                    dataKey="revenue"
                    nameKey="channelLabel"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    label={({ channelLabel, percent }) => `${channelLabel} ${(percent * 100).toFixed(0)}%`}
                  >
                    {profitByChannel.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">销售趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <EmptyState icon={TrendingUp} title="暂无数据" desc="还没有趋势数据" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} />
                <Tooltip formatter={(v: number, name: string) => [formatPrice(v), name === 'revenue' ? '销售额' : '毛利']} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" fill="#05966920" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" stroke="#0ea5e9" fill="#0ea5e920" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Batch Payback Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">批次回本看板</CardTitle>
            <Badge variant="outline">{batchProfit.length} 个批次</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {batchProfit.length === 0 ? (
            <EmptyState icon={Layers} title="暂无批次" desc="还没有创建任何批次" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>批次编号</TableHead>
                    <TableHead>材质</TableHead>
                    <TableHead className="text-right">总成本</TableHead>
                    <TableHead className="text-right">已售/总数</TableHead>
                    <TableHead className="text-right">已回款</TableHead>
                    <TableHead className="text-right">利润</TableHead>
                    <TableHead>回本进度</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchProfit.map((bp) => (
                    <TableRow key={bp.batchCode}>
                      <TableCell className="font-mono text-sm">{bp.batchCode}</TableCell>
                      <TableCell>{bp.materialName}</TableCell>
                      <TableCell className="text-right">{formatPrice(bp.totalCost)}</TableCell>
                      <TableCell className="text-right">{bp.soldCount}/{bp.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(bp.revenue)}</TableCell>
                      <TableCell className={`text-right font-medium ${bp.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatPrice(bp.profit)}
                      </TableCell>
                      <TableCell><PaybackBar rate={bp.paybackRate} /></TableCell>
                      <TableCell><StatusBadge status={bp.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Aging */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">压货预警</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">阈值</Label>
              <Input type="number" value={minDays} onChange={e => setMinDays(parseInt(e.target.value) || 90)} className="w-16 h-8 text-sm" />
              <Label className="text-sm">天</Label>
              <Button size="sm" variant="outline" onClick={fetchData}><RefreshCw className="h-3 w-3" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(!stockAging.items || stockAging.items.length === 0) ? (
            <EmptyState icon={CheckCircle} title="暂无压货" desc="所有货品在正常库龄范围内" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>材质</TableHead>
                      <TableHead>器型</TableHead>
                      <TableHead className="text-right">成本</TableHead>
                      <TableHead className="text-right">售价</TableHead>
                      <TableHead className="text-right">在库天数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockAging.items.slice(0, 20).map((item: any) => (
                      <TableRow key={item.itemId} className="hover:bg-red-50 dark:hover:bg-red-950/20">
                        <TableCell className="font-mono text-sm">{item.skuCode}</TableCell>
                        <TableCell>{item.materialName}</TableCell>
                        <TableCell>{item.typeName || '-'}</TableCell>
                        <TableCell className="text-right">{formatPrice(item.allocatedCost || item.costPrice)}</TableCell>
                        <TableCell className="text-right">{formatPrice(item.sellingPrice)}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{item.ageDays}天</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Separator className="my-3" />
              <p className="text-sm text-muted-foreground">
                共 {stockAging.totalItems} 件压货，占用资金 {formatPrice(stockAging.totalValue)}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ========== Inventory Tab ==========
function InventoryTab() {
  const [items, setItems] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ materialId: '', status: 'in_stock', keyword: '', counter: '' });

  useEffect(() => {
    dictsApi.getMaterials().then(setMaterials).catch(() => {});
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, size: pagination.size };
      if (filters.materialId) params.material_id = filters.materialId;
      if (filters.status) params.status = filters.status;
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.counter) params.counter = filters.counter;
      const data = await itemsApi.getItems(params);
      setItems(data.items || []);
      setPagination(data.pagination || { total: 0, page: 1, size: 20, pages: 0 });
    } catch (e: any) {
      toast.error('加载库存失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filters]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Sale dialog
  const [saleDialog, setSaleDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [saleForm, setSaleForm] = useState({ actualPrice: 0, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' });

  async function handleSale() {
    if (!saleDialog.item) return;
    try {
      await salesApi.createSale({
        itemId: saleDialog.item.id,
        actualPrice: saleForm.actualPrice,
        channel: saleForm.channel,
        saleDate: saleForm.saleDate,
        note: saleForm.note,
      });
      toast.success('出库成功！');
      setSaleDialog({ open: false, item: null });
      fetchItems();
    } catch (e: any) {
      toast.error(e.message || '出库失败');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定删除此货品？')) return;
    try {
      await itemsApi.deleteItem(id);
      toast.success('删除成功');
      fetchItems();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (loading && items.length === 0) return <LoadingSkeleton />;

  const totalValue = items.reduce((sum, i) => sum + (i.allocatedCost || i.costPrice || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总库存</p><p className="text-2xl font-bold">{pagination.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">在库中</p><p className="text-2xl font-bold text-emerald-600">{items.filter(i => i.status === 'in_stock').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">库存价值</p><p className="text-2xl font-bold text-emerald-600">{formatPrice(totalValue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">当前页</p><p className="text-2xl font-bold">{pagination.page}/{pagination.pages || 1}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">关键词</Label>
              <Input placeholder="SKU/名称/证书" value={filters.keyword} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">材质</Label>
              <Select value={filters.materialId} onValueChange={v => setFilters(f => ({ ...f, materialId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部材质</SelectItem>
                  {materials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">状态</Label>
              <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="in_stock">在库</SelectItem>
                  <SelectItem value="sold">已售</SelectItem>
                  <SelectItem value="returned">已退</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">柜台</Label>
              <Input type="number" placeholder="柜台号" value={filters.counter} onChange={e => setFilters(f => ({ ...f, counter: e.target.value }))} className="h-9" />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchItems(); }} className="h-9"><Search className="h-3 w-3 mr-1" />搜索</Button>
              <Button size="sm" variant="outline" onClick={() => setFilters({ materialId: '', status: 'in_stock', keyword: '', counter: '' })} className="h-9">重置</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      {items.length === 0 ? (
        <EmptyState icon={Package} title="暂无货品" desc="还没有入库任何货品" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>材质</TableHead>
                    <TableHead>器型</TableHead>
                    <TableHead className="text-right">成本</TableHead>
                    <TableHead className="text-right">售价</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>库龄</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.skuCode}</TableCell>
                      <TableCell>{item.name || item.skuCode}</TableCell>
                      <TableCell>{item.materialName}</TableCell>
                      <TableCell>{item.typeName || '-'}</TableCell>
                      <TableCell className="text-right">{formatPrice(item.allocatedCost || item.costPrice)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatPrice(item.sellingPrice)}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell className={item.ageDays > 90 ? 'text-red-600 font-medium' : ''}>
                        {item.ageDays != null ? `${item.ageDays}天` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.status === 'in_stock' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={() => {
                              setSaleDialog({ open: true, item });
                              setSaleForm({ actualPrice: item.sellingPrice, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' });
                            }}>
                              <DollarSign className="h-3 w-3" /> 出库
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
          <DialogHeader>
            <DialogTitle>销售出库</DialogTitle>
            <DialogDescription>货品: {saleDialog.item?.skuCode} - {saleDialog.item?.name || saleDialog.item?.skuCode}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>成交价</Label>
              <Input type="number" value={saleForm.actualPrice} onChange={e => setSaleForm(f => ({ ...f, actualPrice: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1">
              <Label>销售渠道</Label>
              <Select value={saleForm.channel} onValueChange={v => setSaleForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="store">门店</SelectItem>
                  <SelectItem value="wechat">微信</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>销售日期</Label>
              <Input type="date" value={saleForm.saleDate} onChange={e => setSaleForm(f => ({ ...f, saleDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>备注</Label>
              <Textarea value={saleForm.note} onChange={e => setSaleForm(f => ({ ...f, note: e.target.value }))} placeholder="可选" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleDialog({ open: false, item: null })}>取消</Button>
            <Button onClick={handleSale} className="bg-emerald-600 hover:bg-emerald-700">确认出库</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Sales Tab ==========
function SalesTab() {
  const [sales, setSales] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ channel: '', startDate: '', endDate: '' });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, size: pagination.size };
      if (filters.channel) params.channel = filters.channel;
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      const data = await salesApi.getSales(params);
      setSales(data.items || []);
      setPagination(data.pagination || { total: 0, page: 1, size: 20, pages: 0 });
    } catch (e: any) {
      toast.error('加载销售记录失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filters]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  if (loading && sales.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">渠道</Label>
              <Select value={filters.channel} onValueChange={v => setFilters(f => ({ ...f, channel: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="store">门店</SelectItem>
                  <SelectItem value="wechat">微信</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">开始日期</Label>
              <Input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">结束日期</Label>
              <Input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="h-9" />
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchSales(); }} className="h-9"><Search className="h-3 w-3 mr-1" />搜索</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      {sales.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="暂无销售记录" desc="还没有任何销售" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>销售单号</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>货品</TableHead>
                    <TableHead className="text-right">成交价</TableHead>
                    <TableHead>渠道</TableHead>
                    <TableHead>日期</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead className="text-right">毛利</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map(sale => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">{sale.saleNo}</TableCell>
                      <TableCell className="font-mono text-xs">{sale.itemSku}</TableCell>
                      <TableCell>{sale.itemName || sale.itemSku}</TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(sale.actualPrice)}</TableCell>
                      <TableCell><Badge variant="outline">{sale.channel === 'store' ? '门店' : '微信'}</Badge></TableCell>
                      <TableCell>{sale.saleDate}</TableCell>
                      <TableCell>{sale.customerName || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${sale.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatPrice(sale.grossProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>上一页</Button>
          <span className="text-sm text-muted-foreground">{pagination.page} / {pagination.pages}</span>
          <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>下一页</Button>
        </div>
      )}
    </div>
  );
}

// ========== Batches Tab ==========
function BatchesTab() {
  const [batches, setBatches] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await batchesApi.getBatches({ page: pagination.page, size: pagination.size });
      setBatches(data.items || []);
      setPagination(data.pagination || { total: 0, page: 1, size: 20, pages: 0 });
    } catch (e: any) {
      toast.error('加载批次失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  async function handleAllocate(batchId: number) {
    try {
      const result = await batchesApi.allocateBatch(batchId);
      toast.success(`成本分摊完成！共 ${result.items?.length || 0} 件货品`);
      fetchBatches();
    } catch (e: any) {
      toast.error(e.message || '分摊失败');
    }
  }

  if (loading && batches.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总批次</p><p className="text-2xl font-bold">{pagination.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已回本</p><p className="text-2xl font-bold text-emerald-600">{batches.filter(b => b.status === 'paid_back' || b.status === 'cleared').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">销售中</p><p className="text-2xl font-bold text-sky-600">{batches.filter(b => b.status === 'selling').length}</p></CardContent></Card>
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
                    <TableHead>批次编号</TableHead>
                    <TableHead>材质</TableHead>
                    <TableHead className="text-right">总成本</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>分摊方式</TableHead>
                    <TableHead className="text-right">已售</TableHead>
                    <TableHead className="text-right">已回款</TableHead>
                    <TableHead>回本进度</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm">{b.batchCode}</TableCell>
                      <TableCell>{b.materialName}</TableCell>
                      <TableCell className="text-right">{formatPrice(b.totalCost)}</TableCell>
                      <TableCell className="text-right">{b.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{({ equal: '均摊', by_weight: '按克重', by_price: '按售价' } as any)[b.costAllocMethod] || b.costAllocMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{b.soldCount}/{b.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(b.revenue)}</TableCell>
                      <TableCell><PaybackBar rate={b.paybackRate} /></TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                      <TableCell className="text-right">
                        {b.itemsCount === b.quantity && b.soldCount === 0 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAllocate(b.id)}>分摊</Button>
                        )}
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
    </div>
  );
}

// ========== Customers Tab ==========
function CustomersTab() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', phone: '', wechat: '', notes: '' });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customersApi.getCustomers({ page: pagination.page, size: pagination.size, keyword });
      setCustomers(data.items || []);
      setPagination(data.pagination || { total: 0, page: 1, size: 20, pages: 0 });
    } catch (e: any) {
      toast.error('加载客户失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, keyword]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function handleCreate() {
    try {
      await customersApi.createCustomer(createForm);
      toast.success('客户创建成功');
      setShowCreate(false);
      setCreateForm({ name: '', phone: '', wechat: '', notes: '' });
      fetchCustomers();
    } catch (e: any) {
      toast.error(e.message || '创建失败');
    }
  }

  if (loading && customers.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input placeholder="搜索客户" value={keyword} onChange={e => setKeyword(e.target.value)} className="w-48 h-9" />
          <Button size="sm" onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchCustomers(); }}><Search className="h-3 w-3" /></Button>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreate(true)}>
          <Plus className="h-3 w-3 mr-1" /> 新增客户
        </Button>
      </div>

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="暂无客户" desc="还没有添加任何客户" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{c.name}</h3>
                  <Badge variant="outline" className="text-xs">{c.customerCode}</Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {c.phone && <p>📞 {c.phone}</p>}
                  {c.wechat && <p>💬 {c.wechat}</p>}
                  {c.notes && <p className="truncate">📝 {c.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增客户</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>姓名 *</Label><Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>电话</Label><Input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>微信号</Label><Input value={createForm.wechat} onChange={e => setCreateForm(f => ({ ...f, wechat: e.target.value }))} /></div>
            <div className="space-y-1"><Label>备注</Label><Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700" disabled={!createForm.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Settings Tab ==========
function SettingsTab() {
  const [subTab, setSubTab] = useState('dicts');
  const [materials, setMaterials] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [m, t, tg, c, s] = await Promise.all([
          dictsApi.getMaterials(true),
          dictsApi.getTypes(true),
          dictsApi.getTags(undefined, true),
          configApi.getConfig(),
          suppliersApi.getSuppliers(),
        ]);
        setMaterials(m || []);
        setTypes(t || []);
        setTags(tg || []);
        setConfigs(c || []);
        setSuppliers(s?.items || []);
      } catch (e: any) {
        toast.error('加载设置数据失败');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  async function toggleMaterialActive(id: number, isActive: boolean) {
    try {
      await dictsApi.updateMaterial(id, { isActive: !isActive });
      setMaterials(m => m.map(x => x.id === id ? { ...x, isActive: !isActive } : x));
      toast.success(isActive ? '已停用' : '已启用');
    } catch (e: any) { toast.error(e.message); }
  }

  async function updateConfig(key: string, value: string) {
    try {
      await configApi.updateConfig(key, value);
      setConfigs(c => c.map(x => x.key === key ? { ...x, value } : x));
      toast.success('配置已更新');
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <LoadingSkeleton />;

  const tagGroups = tags.reduce((acc: any, tag: any) => {
    const g = tag.groupName || '未分组';
    if (!acc[g]) acc[g] = [];
    acc[g].push(tag);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="dicts">字典管理</TabsTrigger>
          <TabsTrigger value="metal">贵金属市价</TabsTrigger>
          <TabsTrigger value="suppliers">供应商</TabsTrigger>
          <TabsTrigger value="config">系统配置</TabsTrigger>
        </TabsList>

        <TabsContent value="dicts" className="mt-4 space-y-4">
          {/* Materials */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">材质 ({materials.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>子类</TableHead>
                      <TableHead>产地</TableHead>
                      <TableHead className="text-right">克重单价</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map(m => (
                      <TableRow key={m.id} className={!m.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{m.subType || '-'}</TableCell>
                        <TableCell>{m.origin || '-'}</TableCell>
                        <TableCell className="text-right">{m.costPerGram ? `¥${m.costPerGram}` : '-'}</TableCell>
                        <TableCell><Badge variant={m.isActive ? 'default' : 'secondary'} className={m.isActive ? 'bg-emerald-100 text-emerald-800' : ''}>{m.isActive ? '启用' : '停用'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleMaterialActive(m.id, m.isActive)}>
                            {m.isActive ? '停用' : '启用'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Types */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">器型 ({types.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>规格字段</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {types.map(t => (
                      <TableRow key={t.id} className={!t.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.specFields ? JSON.parse(t.specFields).join(', ') : '-'}</TableCell>
                        <TableCell><Badge variant={t.isActive ? 'default' : 'secondary'} className={t.isActive ? 'bg-emerald-100 text-emerald-800' : ''}>{t.isActive ? '启用' : '停用'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">标签 ({tags.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(tagGroups).map(([group, groupTags]: [string, any]) => (
                  <div key={group}>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {groupTags.map((tag: any) => (
                        <Badge key={tag.id} variant={tag.isActive ? 'default' : 'secondary'} className={tag.isActive ? 'bg-emerald-100 text-emerald-800' : 'opacity-50'}>
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metal" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">贵金属市价管理</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">当前配置了克重单价的材质，市价变动时可批量重算在库货品零售价。</p>
              <div className="space-y-3">
                {materials.filter(m => m.costPerGram).map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{m.name}{m.subType ? ` (${m.subType})` : ''}</p>
                      <p className="text-sm text-muted-foreground">当前: ¥{m.costPerGram}/克</p>
                    </div>
                    <Input
                      type="number"
                      className="w-28 h-8 text-sm"
                      placeholder="更新单价"
                      onBlur={async (e) => {
                        const val = parseFloat(e.target.value);
                        if (val && val !== m.costPerGram) {
                          try {
                            await metalApi.updatePrice({ materialId: m.id, pricePerGram: val });
                            setMaterials(ms => ms.map(x => x.id === m.id ? { ...x, costPerGram: val } : x));
                            toast.success(`${m.name}市价已更新为 ¥${val}/克`);
                          } catch (e: any) { toast.error(e.message); }
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">供应商 ({suppliers.length})</CardTitle></CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <EmptyState icon={Factory} title="暂无供应商" desc="还没有添加任何供应商" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suppliers.map((s: any) => (
                    <div key={s.id} className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{s.name}</p>
                      {s.contact && <p className="text-sm text-muted-foreground">{s.contact}</p>}
                      {s.notes && <p className="text-sm text-muted-foreground truncate">{s.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">系统配置</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configs.map(c => (
                  <div key={c.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{c.description || c.key}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.key}</p>
                    </div>
                    <Input
                      type="text"
                      value={c.value}
                      className="w-32 h-8 text-sm"
                      onBlur={e => { if (e.target.value !== c.value) updateConfig(c.key, e.target.value); }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== Mobile Bottom Navigation ==========
function MobileNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: '看板', icon: BarChart3 },
    { id: 'inventory', label: '库存', icon: Package },
    { id: 'sales', label: '销售', icon: ShoppingCart },
    { id: 'batches', label: '批次', icon: Layers },
    { id: 'customers', label: '客户', icon: Users },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t border-border shadow-lg pb-safe z-50">
      <div className="flex items-center h-14">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full text-[10px] font-medium transition-colors gap-0.5 ${active ? 'text-emerald-600' : 'text-muted-foreground'}`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ========== Desktop Sidebar Navigation ==========
function DesktopNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: '利润看板', icon: LayoutDashboard },
    { id: 'inventory', label: '库存管理', icon: Package },
    { id: 'sales', label: '销售记录', icon: ShoppingCart },
    { id: 'batches', label: '批次管理', icon: Layers },
    { id: 'customers', label: '客户管理', icon: Users },
    { id: 'settings', label: '系统设置', icon: Settings },
  ];

  return (
    <nav className="hidden md:flex bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14">
          <div className="flex items-center mr-8">
            <Gem className="h-5 w-5 text-emerald-600 mr-2" />
            <span className="text-lg font-bold text-emerald-600">玉器进销存</span>
          </div>
          <div className="flex space-x-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${active ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

// ========== Main Page ==========
export default function JadeInventoryPage() {
  const { activeTab, setActiveTab } = useAppStore();

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'inventory': return <InventoryTab />;
      case 'sales': return <SalesTab />;
      case 'batches': return <BatchesTab />;
      case 'customers': return <CustomersTab />;
      case 'settings': return <SettingsTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DesktopNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 px-4 py-4 md:px-6 md:py-6 pb-20 md:pb-6 max-w-7xl mx-auto w-full">
        {renderTab()}
      </main>
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
