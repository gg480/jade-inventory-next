'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { salesApi, exportApi, dashboardApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge, EmptyState, LoadingSkeleton } from './shared';
import BundleSaleDialog from './bundle-sale-dialog';
import Pagination from './pagination';

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
  ShoppingCart, TrendingUp, DollarSign, BarChart3, Search, Link2, FileDown, RotateCcw, Store, MessageCircle,
  CalendarDays, ArrowUp, ArrowDown,
} from 'lucide-react';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ========== Sales Tab ==========
function SalesTab() {
  const [sales, setSales] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ channel: '', startDate: '', endDate: '', keyword: '' });
  const [showBundle, setShowBundle] = useState(false);
  const [datePreset, setDatePreset] = useState('all');

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
      if (filters.keyword) params.keyword = filters.keyword;
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

  function handleExportCSV() {
    const dataToExport = sales.length > 0 ? sales : [];
    if (dataToExport.length === 0) {
      toast.error('没有可导出的销售数据');
      return;
    }
    const headers = ['销售日期', 'SKU', '货品名称', '客户', '售价', '成本', '利润', '渠道', '柜台号'];
    const channelMap: Record<string, string> = { store: '门店', wechat: '微信' };
    const rows = dataToExport.map((s: any) => [
      s.saleDate || '',
      s.itemSku || '',
      s.itemName || s.itemSku || '',
      s.customerName || '',
      s.actualPrice || 0,
      s.costPrice || 0,
      s.grossProfit || 0,
      channelMap[s.channel] || s.channel || '',
      s.counter || '',
    ]);
    // Add BOM for Excel UTF-8 compatibility
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map((cell: any) => {
      const str = String(cell);
      // Escape quotes and wrap if contains comma/quote/newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `销售记录_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${dataToExport.length} 条销售记录`);
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

  function formatChannelBadge(channel: string) {
    if (!channel) return null;
    if (channel === 'store') return <Badge variant="outline" className="border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30"><Store className="h-2.5 w-2.5 mr-1" />门店</Badge>;
    if (channel === 'wechat') return <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"><MessageCircle className="h-2.5 w-2.5 mr-1" />微信</Badge>;
    return <Badge variant="outline">{channel}</Badge>;
  }

  function handleDatePreset(preset: string) {
    setDatePreset(preset);
    const today = new Date();
    let start = '';
    let end = today.toISOString().slice(0, 10);
    switch (preset) {
      case 'today': start = end; break;
      case 'week': start = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10); break;
      case 'month': start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10); break;
      case 'quarter': start = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0, 10); break;
      case 'year': start = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10); break;
      default: start = ''; end = '';
    }
    setFilters(f => ({ ...f, startDate: start, endDate: end }));
  }

  return (
    <div className="space-y-6">
      {/* Today Stats Row */}
      {todayStats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">今日销售数</p>
              <p className="text-xl font-bold">{todayStats.count} <span className="text-xs font-normal text-muted-foreground">件</span></p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-sky-500 hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">今日营收</p>
              <p className="text-xl font-bold text-emerald-600">{formatPrice(todayStats.revenue)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
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
          {/* Quick date range */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            {[
              { key: 'all', label: '全部' },
              { key: 'today', label: '今日' },
              { key: 'week', label: '近7天' },
              { key: 'month', label: '本月' },
              { key: 'quarter', label: '本季度' },
              { key: 'year', label: '本年' },
            ].map(p => (
              <Button
                key={p.key}
                size="sm"
                variant={datePreset === p.key ? 'default' : 'outline'}
                className={`h-7 text-xs ${datePreset === p.key ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                onClick={() => handleDatePreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1"><Label className="text-xs">关键词</Label><Input placeholder="SKU/单号/客户" value={filters.keyword} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">渠道</Label>
              <Select value={filters.channel || 'all'} onValueChange={v => setFilters(f => ({ ...f, channel: v === 'all' ? '' : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent><SelectItem value="all">全部</SelectItem><SelectItem value="store">门店</SelectItem><SelectItem value="wechat">微信</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">开始日期</Label><Input type="date" value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setDatePreset('custom'); }} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">结束日期</Label><Input type="date" value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setDatePreset('custom'); }} className="h-9" /></div>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchSales(); }} className="h-9"><Search className="h-3 w-3 mr-1" />搜索</Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => setShowBundle(true)}><Link2 className="h-3 w-3 mr-1" />套装销售</Button>
            <Button size="sm" variant="outline" className="h-9" onClick={handleExportCSV} disabled={sales.length === 0}><FileDown className="h-3 w-3 mr-1" />导出CSV</Button>
            <a href={exportApi.sales()} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-9"><FileDown className="h-3 w-3 mr-1" />导出</Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table - Desktop */}
      {sales.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="暂无销售记录" desc="还没有任何销售记录，去库存页面进行出库操作" />
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>销售单号</TableHead><TableHead>SKU</TableHead><TableHead>渠道</TableHead><TableHead>货品</TableHead>
                      <TableHead className="text-right">成交价</TableHead>
                      <TableHead>日期</TableHead><TableHead>客户</TableHead><TableHead className="text-right">毛利</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map(sale => {
                      const profit = sale.grossProfit || 0;
                      const isProfit = profit > 0;
                      const isLoss = profit < 0;
                      const rowBg = isProfit ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : isLoss ? 'bg-red-50/50 dark:bg-red-950/20' : '';
                      return (
                      <TableRow key={sale.id} className={`hover:bg-muted/50 transition-all duration-150 ${rowBg}`}>
                        <TableCell className="font-mono text-xs">{sale.saleNo}</TableCell>
                        <TableCell className="font-mono text-xs">{sale.itemSku}</TableCell>
                        <TableCell>{formatChannelBadge(sale.channel) || '-'}</TableCell>
                        <TableCell>{sale.itemName || sale.itemSku}</TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(sale.actualPrice)}</TableCell>
                        <TableCell>{sale.saleDate}</TableCell>
                        <TableCell>{sale.customerName || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          <span className="inline-flex items-center gap-1">
                            {isProfit ? <ArrowUp className="h-3 w-3" /> : isLoss ? <ArrowDown className="h-3 w-3" /> : null}
                            {formatPrice(profit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-600 hover:text-orange-700" onClick={() => openReturnDialog(sale)} title="退货">
                            <RotateCcw className="h-3 w-3 mr-1" />退货
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                    {/* Summary Row */}
                    <TableRow className="bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {sales.map(sale => (
              <Card key={sale.id} className={`hover:shadow-md transition-shadow ${sale.grossProfit > 0 ? 'border-l-2 border-l-emerald-400' : sale.grossProfit < 0 ? 'border-l-2 border-l-red-400' : ''}`}>
                <CardContent className="p-4 space-y-2">
                  {/* Header: saleNo + channel */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{sale.saleNo}</span>
                    {formatChannelBadge(sale.channel)}
                  </div>
                  {/* Item info */}
                  <p className="font-medium text-sm truncate">{sale.itemName || sale.itemSku}</p>
                  <p className="text-xs text-muted-foreground font-mono">{sale.itemSku}</p>
                  {/* Price + Profit row */}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-emerald-600">{formatPrice(sale.actualPrice)}</span>
                    <span className={`text-sm font-medium inline-flex items-center gap-1 ${sale.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {sale.grossProfit > 0 ? <ArrowUp className="h-3 w-3" /> : sale.grossProfit < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                      {sale.grossProfit >= 0 ? '+' : ''}{formatPrice(sale.grossProfit)}
                    </span>
                  </div>
                  {/* Meta row: date + customer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{sale.saleDate}</span>
                    {sale.customerName && <span>{sale.customerName}</span>}
                  </div>
                  {/* Return button */}
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs text-orange-600" onClick={() => openReturnDialog(sale)}>
                      <RotateCcw className="h-3 w-3 mr-1" />退货
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Summary card */}
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold">
              <CardContent className="p-3 flex items-center justify-between text-sm">
                <span className="font-medium">合计 ({pagination.total} 条)</span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600 font-medium">{formatPrice(totalRevenue)}</span>
                  <span className={totalProfit >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>{formatPrice(totalProfit)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Pagination */}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={p => setPagination(prev => ({ ...prev, page: p }))} />

      {/* Profit Trend Sparkline + Channel Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <RTooltip formatter={(v: number) => formatPrice(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="#059669" fill="url(#revenueGrad)" strokeWidth={2} name="营收" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        {/* Channel Breakdown */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-amber-600" />渠道分析</p>
            {sales.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-28 h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '门店', value: storeCount, color: '#059669' },
                          { name: '微信', value: wechatCount, color: '#0284c7' },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={25} outerRadius={45}
                        dataKey="value" stroke="none"
                      >
                        {[
                          { name: '门店', value: storeCount, color: '#059669' },
                          { name: '微信', value: wechatCount, color: '#0284c7' },
                        ].filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RTooltip formatter={(v: number) => `${v} 件`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    { label: '门店', count: storeCount, revenue: sales.filter(s => s.channel === 'store').reduce((sum, s) => sum + (s.actualPrice || 0), 0), color: 'bg-emerald-500', icon: Store },
                    { label: '微信', count: wechatCount, revenue: sales.filter(s => s.channel === 'wechat').reduce((sum, s) => sum + (s.actualPrice || 0), 0), color: 'bg-sky-500', icon: MessageCircle },
                  ].filter(ch => ch.count > 0).map(ch => {
                    const ChIcon = ch.icon;
                    const pct = sales.length > 0 ? Math.round((ch.count / sales.length) * 100) : 0;
                    return (
                      <div key={ch.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            <ChIcon className="h-3.5 w-3.5" />
                            <span className="font-medium">{ch.label}</span>
                            <span className="text-muted-foreground text-xs">{ch.count}件 ({pct}%)</span>
                          </div>
                          <span className="text-emerald-600 font-medium text-xs">{formatPrice(ch.revenue)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className={`${ch.color} rounded-full h-1.5 transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">暂无销售数据</p>
            )}
          </CardContent>
        </Card>
      </div>

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
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p><span className="text-muted-foreground">销售单号:</span> <span className="font-mono">{returnDialog.sale?.saleNo}</span></p>
              <p><span className="text-muted-foreground">成交价:</span> <span className="font-medium text-emerald-600">{formatPrice(returnDialog.sale?.actualPrice || 0)}</span></p>
              <p><span className="text-muted-foreground">销售日期:</span> {returnDialog.sale?.saleDate}</p>
              {returnDialog.sale?.customerName && <p><span className="text-muted-foreground">客户:</span> {returnDialog.sale.customerName}</p>}
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
