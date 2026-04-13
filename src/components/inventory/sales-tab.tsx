'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { salesApi, exportApi, dashboardApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, EmptyState, LoadingSkeleton } from './shared';
import BundleSaleDialog from './bundle-sale-dialog';

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
  ShoppingCart, TrendingUp, DollarSign, BarChart3, Search, Link2, FileDown, RotateCcw,
} from 'lucide-react';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ========== Sales Tab ==========
function SalesTab() {
  const [sales, setSales] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ channel: '', startDate: '', endDate: '' });
  const [showBundle, setShowBundle] = useState(false);

  // Return dialog state
  const [returnDialog, setReturnDialog] = useState<{ open: boolean; sale: any }>({ open: false, sale: null });
  const [returnForm, setReturnForm] = useState({ refundAmount: 0, returnReason: '', returnDate: new Date().toISOString().slice(0, 10) });

  // Today stats
  const [todayStats, setTodayStats] = useState<{ count: number; revenue: number; profit: number } | null>(null);

  // Sparkline data
  const [sparklineData, setSparklineData] = useState<any[]>([]);
  const [sparkLoading, setSparkLoading] = useState(true);

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
    } catch { toast.error('加载销售记录失败'); } finally { setLoading(false); }
  }, [pagination.page, pagination.size, filters]);

  // Fetch today's stats separately
  useEffect(() => {
    async function fetchTodayStats() {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const data = await salesApi.getSales({ start_date: todayStr, end_date: todayStr, size: 1000 });
        const todayItems = data.items || [];
        setTodayStats({
          count: todayItems.length,
          revenue: todayItems.reduce((sum: number, s: any) => sum + (s.actualPrice || 0), 0),
          profit: todayItems.reduce((sum: number, s: any) => sum + (s.grossProfit || 0), 0),
        });
      } catch { setTodayStats({ count: 0, revenue: 0, profit: 0 }); }
    }
    fetchTodayStats();
  }, []);

  const fetchSparkline = useCallback(async () => {
    setSparkLoading(true);
    try {
      const trend = await dashboardApi.getTrend({ months: 1 });
      // Convert to daily data for last 30 days
      const dailyMap: Record<string, { revenue: number; profit: number }> = {};
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dailyMap[key] = { revenue: 0, profit: 0 };
      }
      // If trend has daily granularity, use it; otherwise just show monthly
      if (trend && trend.length > 0) {
        setSparklineData(trend.map((t: any) => ({
          date: t.yearMonth || t.date || t.label,
          revenue: t.revenue || 0,
          profit: t.profit || 0,
        })));
      } else {
        setSparklineData([]);
      }
    } catch {
      setSparklineData([]);
    } finally { setSparkLoading(false); }
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { fetchSparkline(); }, [fetchSparkline]);

  if (loading && sales.length === 0) return <LoadingSkeleton />;

  const totalRevenue = sales.reduce((s, sale) => s + (sale.actualPrice || 0), 0);
  const totalProfit = sales.reduce((s, sale) => s + (sale.grossProfit || 0), 0);
  const storeCount = sales.filter(s => s.channel === 'store').length;
  const wechatCount = sales.filter(s => s.channel === 'wechat').length;

  // Return handler
  function openReturnDialog(sale: any) {
    setReturnDialog({ open: true, sale });
    setReturnForm({ refundAmount: sale.actualPrice || 0, returnReason: '', returnDate: new Date().toISOString().slice(0, 10) });
  }

  async function handleReturn() {
    if (!returnDialog.sale) return;
    try {
      await salesApi.returnSale({
        saleId: returnDialog.sale.id,
        refundAmount: returnForm.refundAmount,
        returnReason: returnForm.returnReason || '客户退货',
        returnDate: returnForm.returnDate,
      });
      toast.success('退货成功！');
      setReturnDialog({ open: false, sale: null });
      fetchSales();
    } catch (e: any) { toast.error(e.message || '退货失败'); }
  }

  return (
    <div className="space-y-6">
      {/* Today Stats Row */}
      {todayStats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">今日销售数</p>
              <p className="text-xl font-bold">{todayStats.count} <span className="text-xs font-normal text-muted-foreground">件</span></p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-sky-500">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">今日营收</p>
              <p className="text-xl font-bold text-emerald-600">{formatPrice(todayStats.revenue)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">今日利润</p>
              <p className={`text-xl font-bold ${todayStats.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(todayStats.profit)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-md hover:border-emerald-400 transition-all duration-200">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><DollarSign className="h-16 w-16 text-emerald-500" /></div>
            <p className="text-sm text-muted-foreground">总销售额</p>
            <p className="text-2xl font-bold text-emerald-600">{formatPrice(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-sky-500 hover:shadow-md hover:border-sky-400 transition-all duration-200">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><TrendingUp className="h-16 w-16 text-sky-500" /></div>
            <p className="text-sm text-muted-foreground">总毛利</p>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(totalProfit)}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-md hover:border-amber-400 transition-all duration-200">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><ShoppingCart className="h-16 w-16 text-amber-500" /></div>
            <p className="text-sm text-muted-foreground">销售件数</p>
            <p className="text-2xl font-bold">{pagination.total}</p>
            <p className="text-xs text-muted-foreground">门店 {storeCount} · 微信 {wechatCount}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-md hover:border-purple-400 transition-all duration-200">
          <CardContent className="p-4">
            <div className="absolute -right-1 -bottom-1 opacity-10"><BarChart3 className="h-16 w-16 text-purple-500" /></div>
            <p className="text-sm text-muted-foreground">毛利率</p>
            <p className="text-2xl font-bold">{totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1"><Label className="text-xs">渠道</Label>
              <Select value={filters.channel} onValueChange={v => setFilters(f => ({ ...f, channel: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent><SelectItem value="all">全部</SelectItem><SelectItem value="store">门店</SelectItem><SelectItem value="wechat">微信</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">开始日期</Label><Input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">结束日期</Label><Input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="h-9" /></div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchSales(); }} className="h-9"><Search className="h-3 w-3 mr-1" />搜索</Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => setShowBundle(true)}><Link2 className="h-3 w-3 mr-1" />套装销售</Button>
            <a href={exportApi.sales()} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-9"><FileDown className="h-3 w-3 mr-1" />导出</Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      {sales.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="暂无销售记录" desc="还没有任何销售记录，去库存页面进行出库操作" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>销售单号</TableHead><TableHead>SKU</TableHead><TableHead>货品</TableHead>
                    <TableHead className="text-right">成交价</TableHead><TableHead>渠道</TableHead>
                    <TableHead>日期</TableHead><TableHead>客户</TableHead><TableHead className="text-right">毛利</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map(sale => (
                    <TableRow key={sale.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs">{sale.saleNo}</TableCell>
                      <TableCell className="font-mono text-xs">{sale.itemSku}</TableCell>
                      <TableCell>{sale.itemName || sale.itemSku}</TableCell>
                      <TableCell className="text-right font-medium">{formatPrice(sale.actualPrice)}</TableCell>
                      <TableCell><Badge variant="outline" className={sale.channel === 'store' ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400' : 'border-sky-300 text-sky-700 dark:text-sky-400'}>{sale.channel === 'store' ? '门店' : '微信'}</Badge></TableCell>
                      <TableCell>{sale.saleDate}</TableCell>
                      <TableCell>{sale.customerName || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${sale.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(sale.grossProfit)}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-600 hover:text-orange-700" onClick={() => openReturnDialog(sale)} title="退货">
                          <RotateCcw className="h-3 w-3 mr-1" />退货
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Summary Row */}
                  <TableRow className="bg-muted/40 font-medium">
                    <TableCell colSpan={3}>合计 ({pagination.total} 条)</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatPrice(totalRevenue)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className={`text-right ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(totalProfit)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
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

      {/* Profit Trend Sparkline */}
      {sparklineData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-sky-600" />营收趋势</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={sparklineData} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" fill="url(#revenueGrad)" strokeWidth={2} name="营收" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bundle Sale Dialog */}
      <BundleSaleDialog open={showBundle} onOpenChange={setShowBundle} onSuccess={fetchSales} />

      {/* Return Dialog */}
      <Dialog open={returnDialog.open} onOpenChange={open => setReturnDialog({ open, sale: open ? returnDialog.sale : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>销售退货</DialogTitle>
            <DialogDescription>
              退货: {returnDialog.sale?.saleNo} — {returnDialog.sale?.itemSku} {returnDialog.sale?.itemName ? `(${returnDialog.sale.itemName})` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p><span className="text-muted-foreground">销售单号:</span> <span className="font-mono">{returnDialog.sale?.saleNo}</span></p>
              <p><span className="text-muted-foreground">成交价:</span> <span className="font-medium text-emerald-600">{formatPrice(returnDialog.sale?.actualPrice || 0)}</span></p>
              <p><span className="text-muted-foreground">销售日期:</span> {returnDialog.sale?.saleDate}</p>
            </div>
            <div className="space-y-1">
              <Label>退款金额</Label>
              <Input type="number" value={returnForm.refundAmount} onChange={e => setReturnForm(f => ({ ...f, refundAmount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1">
              <Label>退货原因</Label>
              <Textarea value={returnForm.returnReason} onChange={e => setReturnForm(f => ({ ...f, returnReason: e.target.value }))} placeholder="请输入退货原因" rows={3} />
            </div>
            <div className="space-y-1">
              <Label>退货日期</Label>
              <Input type="date" value={returnForm.returnDate} onChange={e => setReturnForm(f => ({ ...f, returnDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog({ open: false, sale: null })}>取消</Button>
            <Button onClick={handleReturn} className="bg-orange-600 hover:bg-orange-700" disabled={returnForm.refundAmount <= 0}>确认退货</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SalesTab;
