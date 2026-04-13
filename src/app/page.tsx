'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, TabId } from '@/lib/store';
import { dashboardApi, itemsApi, salesApi, batchesApi, customersApi, suppliersApi, dictsApi, configApi, metalApi, exportApi } from '@/lib/api';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icons
import {
  LayoutDashboard, Package, ShoppingCart, Layers, Users, Settings,
  Plus, Search, Download, RefreshCw, TrendingUp, TrendingDown, DollarSign,
  BarChart3, PieChart, AlertTriangle, CheckCircle, XCircle, Eye,
  Trash2, Edit, ArrowRight, ChevronDown, ChevronUp, Scan, Tag, Gem, Factory,
  Moon, Sun, Monitor, Link2, FileDown, Info, Image as ImageIcon,
  Pencil, RotateCcw, ArrowUpRight
} from 'lucide-react';

// Charts
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';

// ========== CSS Keyframes ==========
const fadeInStyle = typeof document !== 'undefined' && !document.getElementById('fade-in-keyframes')
  ? (() => {
      const style = document.createElement('style');
      style.id = 'fade-in-keyframes';
      style.textContent = `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .tab-fade-in { animation: fadeIn 0.3s ease-out; }
      `;
      document.head.appendChild(style);
      return true;
    })()
  : true;

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
    new: { label: '未开始', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    selling: { label: '销售中', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' },
    paid_back: { label: '已回本', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
    cleared: { label: '清仓完毕', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  };
  const info = map[status] || { label: status, className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' };
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

// ========== Theme Toggle ==========
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);
  return mounted;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  if (!mounted) return <Button variant="ghost" size="sm" className="h-9 w-9 p-0"><Sun className="h-4 w-4" /></Button>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}><Sun className="h-4 w-4 mr-2" />浅色</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}><Moon className="h-4 w-4 mr-2" />深色</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}><Monitor className="h-4 w-4 mr-2" />跟随系统</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  const [distByType, setDistByType] = useState<any>(null);
  const [distByMaterial, setDistByMaterial] = useState<any>(null);
  const [profitByCounter, setProfitByCounter] = useState<any[]>([]);
  const [priceRangeCost, setPriceRangeCost] = useState<any[]>([]);
  const [priceRangeSelling, setPriceRangeSelling] = useState<any[]>([]);
  const [weightDist, setWeightDist] = useState<any>(null);
  const [ageDist, setAgeDist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minDays, setMinDays] = useState(90);
  const [distFilter, setDistFilter] = useState<'year' | 'quarter' | 'month' | 'custom'>('year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getDateRange = useCallback(() => {
    const now = new Date();
    let startDate = '';
    let endDate = now.toISOString().slice(0, 10);
    if (distFilter === 'year') {
      startDate = `${now.getFullYear()}-01-01`;
    } else if (distFilter === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      startDate = `${now.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`;
    } else if (distFilter === 'month') {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    } else {
      startDate = customStart;
      endDate = customEnd || endDate;
    }
    return { startDate, endDate };
  }, [distFilter, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const [s, bp, pc, pch, t, sa, dt, dm, ctr, prc, prs, wd, ad] = await Promise.all([
        dashboardApi.getSummary({ aging_days: minDays }),
        dashboardApi.getBatchProfit({}),
        dashboardApi.getProfitByCategory(params),
        dashboardApi.getProfitByChannel(params),
        dashboardApi.getTrend({ months: 12 }),
        dashboardApi.getStockAging({ min_days: minDays }),
        dashboardApi.getDistributionByType(params),
        dashboardApi.getDistributionByMaterial(params),
        dashboardApi.getProfitByCounter(params),
        dashboardApi.getPriceRangeCost(),
        dashboardApi.getPriceRangeSelling(),
        dashboardApi.getWeightDistribution(),
        dashboardApi.getAgeDistribution(),
      ]);
      setSummary(s);
      setBatchProfit(bp || []);
      setProfitByCategory(pc || []);
      setProfitByChannel(pch || []);
      setTrend(t || []);
      setStockAging(sa || { items: [], totalItems: 0, totalValue: 0 });
      setDistByType(dt || null);
      setDistByMaterial(dm || null);
      setProfitByCounter(ctr || []);
      setPriceRangeCost(prc || []);
      setPriceRangeSelling(prs || []);
      setWeightDist(wd || null);
      setAgeDist(ad || []);
    } catch {
      toast.error('加载看板数据失败');
    } finally {
      setLoading(false);
    }
  }, [minDays, getDateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSkeleton />;

  const channelLabelMap: Record<string, string> = { store: '门店', wechat: '微信' };
  const batchStatusLabelMap: Record<string, string> = { new: '未开始', selling: '销售中', paid_back: '已回本', cleared: '清仓完毕' };
  const batchStatusColorMap: Record<string, string> = { new: '#94a3b8', selling: '#0ea5e9', paid_back: '#059669', cleared: '#059669' };

  // Batch payback pie data
  const batchPieData = Object.entries(
    batchProfit.reduce((acc: any, b: any) => {
      const label = batchStatusLabelMap[b.status] || b.status;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }));

  // Price range pie label
  const priceLabel = ({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`;

  return (
    <div className="space-y-6">
      {/* ====== 1. Overview Cards ====== */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 hover:scale-[1.02] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md">
            <CardContent className="p-4">
              <div className="absolute -right-2 -bottom-2 opacity-10"><Package className="h-20 w-20 text-emerald-500" /></div>
              <p className="text-sm text-muted-foreground">库存总计</p>
              <p className="text-3xl font-extrabold mt-1">{summary.totalItems}</p>
              <p className="text-xs text-muted-foreground mt-1">库存货值 {formatPrice(summary.totalStockValue)}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-l-4 border-l-sky-500 hover:scale-[1.02] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md">
            <CardContent className="p-4">
              <div className="absolute -right-2 -bottom-2 opacity-10"><TrendingUp className="h-20 w-20 text-sky-500" /></div>
              <p className="text-sm text-muted-foreground">本月销售</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{formatPrice(summary.monthRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.monthSoldCount} 件，毛利 {formatPrice(summary.monthProfit)}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-l-4 border-l-red-500 hover:scale-[1.02] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md">
            <CardContent className="p-4">
              <div className="absolute -right-2 -bottom-2 opacity-10"><AlertTriangle className="h-20 w-20 text-red-500" /></div>
              <p className="text-sm text-muted-foreground">压货预警</p>
              <p className="text-3xl font-extrabold text-red-600 mt-1">{stockAging.totalItems || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">超过 {minDays} 天未售</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-l-4 border-l-amber-500 hover:scale-[1.02] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md">
            <CardContent className="p-4">
              <div className="absolute -right-2 -bottom-2 opacity-10"><CheckCircle className="h-20 w-20 text-amber-500" /></div>
              <p className="text-sm text-muted-foreground">已回本批次</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                {batchProfit.filter(b => b.status === 'paid_back' || b.status === 'cleared').length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">共 {batchProfit.length} 个批次</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== Distribution Filter ====== */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">分析时段:</span>
            {(['year', 'quarter', 'month', 'custom'] as const).map(f => (
              <Button key={f} size="sm" variant={distFilter === f ? 'default' : 'outline'}
                onClick={() => setDistFilter(f)}
                className={distFilter === f ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {{ year: '本年', quarter: '本季', month: '本月', custom: '自定义' }[f]}
              </Button>
            ))}
            {distFilter === 'custom' && (
              <>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-36 h-8 text-xs" />
                <span className="text-xs text-muted-foreground">至</span>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-36 h-8 text-xs" />
              </>
            )}
            <Button size="sm" variant="outline" onClick={fetchData}><RefreshCw className="h-3 w-3 mr-1" />刷新</Button>
          </div>
        </CardContent>
      </Card>

      {/* ====== 2. Product Distribution by Type (4 charts) ====== */}
      {distByType && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" />按器型分布分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 售价分布 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">在库售价分布</p>
                {distByType.priceDistribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distByType.priceDistribution.sort((a: any, b: any) => b.totalSellingPrice - a.totalSellingPrice)} layout="vertical" margin={{ left: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="typeName" width={48} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatPrice(v)} />
                      <Bar dataKey="totalSellingPrice" fill="#059669" radius={[0, 4, 4, 0]} name="售价总额" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={BarChart3} title="暂无数据" desc="" />}
              </div>
              {/* 成交利润 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">成交利润分布</p>
                {distByType.profitDistribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distByType.profitDistribution.sort((a: any, b: any) => b.totalProfit - a.totalProfit)} layout="vertical" margin={{ left: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="typeName" width={48} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatPrice(v)} />
                      <Bar dataKey="totalProfit" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="利润总额" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={BarChart3} title="暂无数据" desc="" />}
              </div>
              {/* 成交数量 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">成交数量分布</p>
                {distByType.countDistribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distByType.countDistribution.sort((a: any, b: any) => b.salesCount - a.salesCount)} layout="vertical" margin={{ left: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="typeName" width={48} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="salesCount" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="成交数" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={BarChart3} title="暂无数据" desc="" />}
              </div>
              {/* 毛利率分布 */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">平均毛利率分布</p>
                {distByType.marginDistribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distByType.marginDistribution.sort((a: any, b: any) => b.avgMargin - a.avgMargin)} layout="vertical" margin={{ left: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="typeName" width={48} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                      <Bar dataKey="avgMargin" fill="#f59e0b" radius={[0, 4, 4, 0]} name="毛利率" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={BarChart3} title="暂无数据" desc="" />}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== 3. Product Distribution by Material (4 charts) ====== */}
      {distByMaterial && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Gem className="h-4 w-4 text-sky-600" />按材质分布分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {distByMaterial.priceDistribution?.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">在库售价分布</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distByMaterial.priceDistribution.sort((a: any, b: any) => b.totalSellingPrice - a.totalSellingPrice)} layout="vertical" margin={{ left: 56 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="materialName" width={56} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatPrice(v)} />
                      <Bar dataKey="totalSellingPrice" fill="#059669" radius={[0, 4, 4, 0]} name="售价总额" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
              {distByMaterial.profitDistribution?.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">成交利润分布</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distByMaterial.profitDistribution.sort((a: any, b: any) => b.totalProfit - a.totalProfit)} layout="vertical" margin={{ left: 56 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="materialName" width={56} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatPrice(v)} />
                      <Bar dataKey="totalProfit" fill="#0ea5e9" radius={[0, 4, 4, 0]} name="利润总额" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
              {distByMaterial.countDistribution?.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">成交数量分布</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distByMaterial.countDistribution.sort((a: any, b: any) => b.salesCount - a.salesCount)} layout="vertical" margin={{ left: 56 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="materialName" width={56} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="salesCount" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="成交数" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
              {distByMaterial.marginDistribution?.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">平均毛利率分布</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distByMaterial.marginDistribution.sort((a: any, b: any) => b.avgMargin - a.avgMargin)} layout="vertical" margin={{ left: 56 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="materialName" width={56} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                      <Bar dataKey="avgMargin" fill="#f59e0b" radius={[0, 4, 4, 0]} name="毛利率" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== 4. Counter Profit + Channel Profit ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4 text-amber-600" />柜台利润分析</CardTitle></CardHeader>
          <CardContent>
            {profitByCounter.length === 0 ? (
              <EmptyState icon={Tag} title="暂无数据" desc="还没有柜台销售数据" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={profitByCounter} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="counter" tickFormatter={v => `${v}号柜`} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) => [formatPrice(v), name === 'totalProfit' ? '利润' : '营收']}
                    labelFormatter={(v: number) => `${v}号柜台`} />
                  <Legend formatter={(v: string) => v === 'totalRevenue' ? '营收' : '利润'} />
                  <Bar dataKey="totalRevenue" fill="#05966930" stroke="#059669" strokeWidth={1} name="totalRevenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalProfit" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="totalProfit" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">按渠道利润</CardTitle></CardHeader>
          <CardContent>
            {profitByChannel.length === 0 ? (
              <EmptyState icon={PieChart} title="暂无数据" desc="还没有渠道数据" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie
                    data={profitByChannel.map(d => ({ ...d, channelLabel: channelLabelMap[d.channel] || d.channel }))}
                    dataKey="revenue" nameKey="channelLabel" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                    label={({ channelLabel, percent }: { channelLabel: string; percent: number }) => `${channelLabel} ${(percent * 100).toFixed(0)}%`}
                  >
                    {profitByChannel.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== 5. Monthly Sales Trend ====== */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-sky-600" />月度销量趋势</CardTitle></CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <EmptyState icon={TrendingUp} title="暂无数据" desc="还没有趋势数据" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => {
                  if (name === 'salesCount') return [v, '销量'];
                  return [formatPrice(v), name === 'revenue' ? '销售额' : '毛利'];
                }} />
                <Legend formatter={(v: string) => ({ revenue: '销售额', profit: '毛利', salesCount: '销量' }[v] || v)} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#059669" fill="#05966920" strokeWidth={2} name="revenue" />
                <Area yAxisId="left" type="monotone" dataKey="profit" stroke="#0ea5e9" fill="#0ea5e920" strokeWidth={2} name="profit" />
                <Line yAxisId="right" type="monotone" dataKey="salesCount" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="salesCount" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ====== 6. Price Range Analysis (2 pie charts) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">成本价格带分布</CardTitle></CardHeader>
          <CardContent>
            {priceRangeCost.every(r => r.count === 0) ? (
              <EmptyState icon={PieChart} title="暂无数据" desc="" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie data={priceRangeCost.filter(r => r.count > 0)} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={priceLabel}>
                    {priceRangeCost.filter(r => r.count > 0).map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [`${v} 件`, name === 'count' ? '件数' : name]} />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">售价价格带分布</CardTitle></CardHeader>
          <CardContent>
            {priceRangeSelling.every(r => r.count === 0) ? (
              <EmptyState icon={PieChart} title="暂无数据" desc="" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie data={priceRangeSelling.filter(r => r.count > 0)} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={priceLabel}>
                    {priceRangeSelling.filter(r => r.count > 0).map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [`${v} 件`, name === 'count' ? '件数' : name]} />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== 7. Weight Distribution (stacked bar) ====== */}
      {weightDist && weightDist.stacked?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-purple-600" />克重产品分布</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weightDist.stacked}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                {weightDist.materials?.map((mat: string, i: number) => (
                  <Bar key={mat} dataKey={`materials.${mat}`} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} name={mat} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ====== 8. Batch Payback (table + pie) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                        <TableHead>批次编号</TableHead><TableHead>材质</TableHead>
                        <TableHead className="text-right">总成本</TableHead><TableHead className="text-right">已售/总数</TableHead>
                        <TableHead className="text-right">已回款</TableHead><TableHead className="text-right">利润</TableHead>
                        <TableHead>回本进度</TableHead><TableHead>状态</TableHead>
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
                          <TableCell className={`text-right font-medium ${bp.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(bp.profit)}</TableCell>
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
        </div>
        <div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">批次状态分布</CardTitle></CardHeader>
            <CardContent>
              {batchPieData.length === 0 ? (
                <EmptyState icon={PieChart} title="暂无数据" desc="" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <RPieChart>
                    <Pie data={batchPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {batchPieData.map((entry, i) => {
                        const color = Object.entries(batchStatusLabelMap).find(([, v]) => v === entry.name)?.[0];
                        return <Cell key={i} fill={color ? batchStatusColorMap[color] : CHART_COLORS[i]} />;
                      })}
                    </Pie>
                    <Tooltip />
                  </RPieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ====== 9. Stock Aging + Age Distribution ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead><TableHead>材质</TableHead><TableHead>器型</TableHead>
                        <TableHead className="text-right">成本</TableHead><TableHead className="text-right">在库天数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockAging.items.slice(0, 20).map((item: any) => (
                        <TableRow key={item.itemId} className="hover:bg-red-50 dark:hover:bg-red-950/20">
                          <TableCell className="font-mono text-sm">{item.skuCode}</TableCell>
                          <TableCell>{item.materialName}</TableCell>
                          <TableCell>{item.typeName || '-'}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.allocatedCost || item.costPrice)}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">{item.ageDays}天</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Separator className="my-3" />
                <p className="text-sm text-muted-foreground">共 {stockAging.totalItems} 件压货，占用资金 {formatPrice(stockAging.totalValue)}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">库龄分布</CardTitle></CardHeader>
          <CardContent>
            {ageDist.length === 0 || ageDist.every(r => r.count === 0) ? (
              <EmptyState icon={BarChart3} title="暂无数据" desc="" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ageDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) => name === 'totalValue' ? [formatPrice(v), '货值'] : [`${v} 件`, '件数']} />
                  <Legend formatter={(v: string) => v === 'count' ? '件数' : '货值'} />
                  <Bar yAxisId="left" dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="count" />
                  <Bar yAxisId="right" dataKey="totalValue" fill="#05966940" stroke="#059669" strokeWidth={1} radius={[4, 4, 0, 0]} name="totalValue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ========== Item Creation Dialog ==========
function ItemCreateDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'high_value' | 'batch'>('high_value');
  const [materials, setMaterials] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [highValueForm, setHighValueForm] = useState({
    materialId: '', typeId: '', costPrice: 0, sellingPrice: 0, name: '',
    origin: '', counter: '', certNo: '', notes: '', supplierId: '', purchaseDate: '',
    weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '',
    tagIds: [] as number[],
  });

  const [batchForm, setBatchForm] = useState({
    batchId: '', sellingPrice: 0, name: '', counter: '', certNo: '', notes: '',
    weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '',
    tagIds: [] as number[],
  });

  useEffect(() => {
    if (open) {
      dictsApi.getMaterials().then(setMaterials).catch(() => {});
      dictsApi.getTypes().then(setTypes).catch(() => {});
      dictsApi.getTags().then(setTags).catch(() => {});
      suppliersApi.getSuppliers().then((s: any) => setSuppliers(s?.items || s || [])).catch(() => {});
      batchesApi.getBatches({ size: 100 }).then((d: any) => setBatches(d?.items || [])).catch(() => {});
    }
  }, [open]);

  const selectedType = types.find((t: any) => String(t.id) === (mode === 'high_value' ? highValueForm.typeId : batchForm.typeId));
  let specFields: string[] = [];
  try { specFields = selectedType?.specFields ? JSON.parse(selectedType.specFields) : []; } catch { specFields = []; }

  const specFieldLabels: Record<string, string> = {
    weight: '克重(g)', metalWeight: '金重(g)', size: '尺寸', braceletSize: '圈口',
    beadCount: '颗数', beadDiameter: '珠径', ringSize: '戒圈',
  };

  function renderSpecFields(form: typeof highValueForm | typeof batchForm, setForm: (f: any) => void) {
    if (specFields.length === 0) return null;
    return (
      <div className="grid grid-cols-2 gap-3">
        {specFields.map((field: string) => (
          <div key={field} className="space-y-1">
            <Label className="text-xs">{specFieldLabels[field] || field}</Label>
            <Input
              type={field === 'beadCount' ? 'number' : 'text'}
              value={(form as any)[field] || ''}
              onChange={e => setForm({ ...(form as any), [field]: e.target.value })}
              className="h-9"
              placeholder={specFieldLabels[field] || field}
            />
          </div>
        ))}
      </div>
    );
  }

  function toggleTag(tagId: number, form: typeof highValueForm, setForm: (f: any) => void) {
    const ids = form.tagIds.includes(tagId) ? form.tagIds.filter(id => id !== tagId) : [...form.tagIds, tagId];
    setForm({ ...form, tagIds: ids });
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === 'high_value') {
        if (!highValueForm.materialId) { toast.error('请选择材质'); setSaving(false); return; }
        if (!highValueForm.sellingPrice) { toast.error('请输入售价'); setSaving(false); return; }
        const spec: Record<string, any> = {};
        specFields.forEach(f => { if ((highValueForm as any)[f]) spec[f] = (highValueForm as any)[f]; });
        await itemsApi.createItem({
          materialId: Number(highValueForm.materialId),
          typeId: highValueForm.typeId ? Number(highValueForm.typeId) : undefined,
          costPrice: highValueForm.costPrice || undefined,
          sellingPrice: highValueForm.sellingPrice,
          name: highValueForm.name || undefined,
          origin: highValueForm.origin || undefined,
          counter: highValueForm.counter ? Number(highValueForm.counter) : undefined,
          certNo: highValueForm.certNo || undefined,
          notes: highValueForm.notes || undefined,
          supplierId: highValueForm.supplierId ? Number(highValueForm.supplierId) : undefined,
          purchaseDate: highValueForm.purchaseDate || undefined,
          spec: Object.keys(spec).length > 0 ? spec : undefined,
          tagIds: highValueForm.tagIds.length > 0 ? highValueForm.tagIds : undefined,
        });
        toast.success('高货入库成功！');
      } else {
        if (!batchForm.batchId) { toast.error('请选择批次'); setSaving(false); return; }
        if (!batchForm.sellingPrice) { toast.error('请输入售价'); setSaving(false); return; }
        const spec: Record<string, any> = {};
        specFields.forEach(f => { if ((batchForm as any)[f]) spec[f] = (batchForm as any)[f]; });
        await itemsApi.createItem({
          batchId: Number(batchForm.batchId),
          sellingPrice: batchForm.sellingPrice,
          name: batchForm.name || undefined,
          counter: batchForm.counter ? Number(batchForm.counter) : undefined,
          certNo: batchForm.certNo || undefined,
          notes: batchForm.notes || undefined,
          spec: Object.keys(spec).length > 0 ? spec : undefined,
          tagIds: batchForm.tagIds.length > 0 ? batchForm.tagIds : undefined,
        });
        toast.success('通货入库成功！');
      }
      setHighValueForm({ materialId: '', typeId: '', costPrice: 0, sellingPrice: 0, name: '', origin: '', counter: '', certNo: '', notes: '', supplierId: '', purchaseDate: '', weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '', tagIds: [] });
      setBatchForm({ batchId: '', sellingPrice: 0, name: '', counter: '', certNo: '', notes: '', weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '', tagIds: [] });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || '入库失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增入库</DialogTitle>
          <DialogDescription>添加新货品到库存</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'high_value' ? 'default' : 'outline'} onClick={() => setMode('high_value')} className={mode === 'high_value' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
              <Gem className="h-3 w-3 mr-1" /> 高货入库
            </Button>
            <Button size="sm" variant={mode === 'batch' ? 'default' : 'outline'} onClick={() => setMode('batch')} className={mode === 'batch' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
              <Layers className="h-3 w-3 mr-1" /> 通货入库
            </Button>
          </div>

          {mode === 'high_value' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">材质 *</Label>
                  <Select value={highValueForm.materialId} onValueChange={v => setHighValueForm(f => ({ ...f, materialId: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="选择材质" /></SelectTrigger>
                    <SelectContent>{materials.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">器型</Label>
                  <Select value={highValueForm.typeId} onValueChange={v => setHighValueForm(f => ({ ...f, typeId: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="选择器型" /></SelectTrigger>
                    <SelectContent>{types.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">成本价</Label><Input type="number" value={highValueForm.costPrice || ''} onChange={e => setHighValueForm(f => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">售价 *</Label><Input type="number" value={highValueForm.sellingPrice || ''} onChange={e => setHighValueForm(f => ({ ...f, sellingPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">名称</Label><Input value={highValueForm.name} onChange={e => setHighValueForm(f => ({ ...f, name: e.target.value }))} className="h-9" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">产地</Label><Input value={highValueForm.origin} onChange={e => setHighValueForm(f => ({ ...f, origin: e.target.value }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">柜台号</Label><Input value={highValueForm.counter} onChange={e => setHighValueForm(f => ({ ...f, counter: e.target.value }))} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">证书号</Label><Input value={highValueForm.certNo} onChange={e => setHighValueForm(f => ({ ...f, certNo: e.target.value }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">供应商</Label>
                  <Select value={highValueForm.supplierId} onValueChange={v => setHighValueForm(f => ({ ...f, supplierId: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="选择供应商" /></SelectTrigger>
                    <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label className="text-xs">采购日期</Label><Input type="date" value={highValueForm.purchaseDate} onChange={e => setHighValueForm(f => ({ ...f, purchaseDate: e.target.value }))} className="h-9" /></div>
              {renderSpecFields(highValueForm, (f: any) => setHighValueForm(f))}
              <div className="space-y-1"><Label className="text-xs">备注</Label><Textarea value={highValueForm.notes} onChange={e => setHighValueForm(f => ({ ...f, notes: e.target.value }))} placeholder="可选" className="h-16" /></div>
              {/* Tags */}
              {tags.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">标签</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.filter((t: any) => t.isActive).map((tag: any) => (
                      <label key={tag.id} className="flex items-center gap-1 cursor-pointer">
                        <Checkbox checked={highValueForm.tagIds.includes(tag.id)} onCheckedChange={() => toggleTag(tag.id, highValueForm, (f: any) => setHighValueForm(f))} />
                        <span className="text-xs">{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1"><Label className="text-xs">所属批次 *</Label>
                <Select value={batchForm.batchId} onValueChange={v => setBatchForm(f => ({ ...f, batchId: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择批次" /></SelectTrigger>
                  <SelectContent>{batches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.batchCode} - {b.materialName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">售价 *</Label><Input type="number" value={batchForm.sellingPrice || ''} onChange={e => setBatchForm(f => ({ ...f, sellingPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">柜台号</Label><Input value={batchForm.counter} onChange={e => setBatchForm(f => ({ ...f, counter: e.target.value }))} className="h-9" /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">名称</Label><Input value={batchForm.name} onChange={e => setBatchForm(f => ({ ...f, name: e.target.value }))} className="h-9" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">证书号</Label><Input value={batchForm.certNo} onChange={e => setBatchForm(f => ({ ...f, certNo: e.target.value }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">器型</Label>
                  <Select value={batchForm.typeId} onValueChange={v => setBatchForm(f => ({ ...f, typeId: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="选择器型" /></SelectTrigger>
                    <SelectContent>{types.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {renderSpecFields(batchForm, (f: any) => setBatchForm(f))}
              <div className="space-y-1"><Label className="text-xs">备注</Label><Textarea value={batchForm.notes} onChange={e => setBatchForm(f => ({ ...f, notes: e.target.value }))} placeholder="可选" className="h-16" /></div>
              {tags.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">标签</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.filter((t: any) => t.isActive).map((tag: any) => (
                      <label key={tag.id} className="flex items-center gap-1 cursor-pointer">
                        <Checkbox checked={batchForm.tagIds.includes(tag.id)} onCheckedChange={() => toggleTag(tag.id, batchForm, (f: any) => setBatchForm(f))} />
                        <span className="text-xs">{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>{saving ? '保存中...' : '确认入库'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== Item Detail Dialog ==========
function ItemDetailDialog({ itemId, open, onOpenChange }: { itemId: number | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const data = await itemsApi.getItem(id);
      setItem(data);
    } catch {
      toast.error('加载货品详情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && itemId) {
      fetchDetail(itemId);
    } else {
      setItem(null);
    }
  }, [open, itemId, fetchDetail]);

  const specFieldLabels: Record<string, string> = {
    weight: '克重(g)', metalWeight: '金重(g)', size: '尺寸', braceletSize: '圈口',
    beadCount: '颗数', beadDiameter: '珠径', ringSize: '戒圈',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>货品详情</DialogTitle>
          <DialogDescription>{item?.skuCode || ''}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3 py-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-32 w-full" /></div>
        ) : item ? (
          <div className="space-y-4 py-2">
            {/* Images placeholder */}
            <div className="flex items-center justify-center h-32 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-1" />
                <p className="text-xs">暂无图片</p>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{item.skuCode}</span></div>
              <div><span className="text-muted-foreground">名称:</span> {item.name || '-'}</div>
              <div><span className="text-muted-foreground">材质:</span> {item.materialName || '-'}</div>
              <div><span className="text-muted-foreground">器型:</span> {item.typeName || '-'}</div>
              <div><span className="text-muted-foreground">状态:</span> <StatusBadge status={item.status} /></div>
              <div><span className="text-muted-foreground">库龄:</span> {item.ageDays != null ? `${item.ageDays}天` : '-'}</div>
            </div>

            <Separator />

            {/* Batch Info */}
            {item.batchCode && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">批次:</span> <span className="font-mono">{item.batchCode}</span></div>
                </div>
                <Separator />
              </>
            )}

            {/* Costs & Prices */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">成本价:</span> <span className="font-medium">{formatPrice(item.costPrice)}</span></div>
              <div><span className="text-muted-foreground">分摊成本:</span> <span className="font-medium">{formatPrice(item.allocatedCost)}</span></div>
              <div><span className="text-muted-foreground">底价:</span> <span className="font-medium">{formatPrice(item.floorPrice)}</span></div>
              <div><span className="text-muted-foreground text-emerald-700">售价:</span> <span className="font-bold text-emerald-600">{formatPrice(item.sellingPrice)}</span></div>
            </div>

            <Separator />

            {/* Other Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">产地:</span> {item.origin || '-'}</div>
              <div><span className="text-muted-foreground">柜台:</span> {item.counter ?? '-'}</div>
              <div><span className="text-muted-foreground">证书号:</span> {item.certNo || '-'}</div>
              <div><span className="text-muted-foreground">供应商:</span> {item.supplierName || '-'}</div>
              <div><span className="text-muted-foreground">采购日期:</span> {item.purchaseDate || '-'}</div>
              <div><span className="text-muted-foreground">创建时间:</span> {item.createdAt ? new Date(item.createdAt).toLocaleDateString('zh-CN') : '-'}</div>
            </div>

            {/* Spec Details */}
            {item.spec && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">规格参数</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(item.spec).map(([key, val]) => (
                      <div key={key}><span className="text-muted-foreground">{specFieldLabels[key] || key}:</span> {String(val)}</div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">标签</p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag: any) => <Badge key={tag.id} variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">{tag.name}</Badge>)}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {item.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">备注</p>
                  <p className="text-sm text-muted-foreground">{item.notes}</p>
                </div>
              </>
            )}

            {/* Sales History */}
            {item.saleRecords && item.saleRecords.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">销售记录</p>
                  <div className="space-y-2">
                    {item.saleRecords.map((sr: any) => (
                      <div key={sr.id} className="p-2 bg-muted/50 rounded text-sm">
                        <div className="flex justify-between"><span className="font-mono text-xs">{sr.saleNo}</span><span className="font-medium">{formatPrice(sr.actualPrice)}</span></div>
                        <div className="text-xs text-muted-foreground">{sr.saleDate} · {sr.channel === 'store' ? '门店' : '微信'}{sr.customerName ? ` · ${sr.customerName}` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">未找到货品信息</div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== Item Edit Dialog ==========
function ItemEditDialog({ itemId, open, onOpenChange, onSuccess }: { itemId: number | null; open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const [item, setItem] = useState<any>(null);
  const [types, setTypes] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', sellingPrice: 0, floorPrice: 0, counter: '', certNo: '', notes: '', origin: '',
    tagIds: [] as number[],
    weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '',
  });

  useEffect(() => {
    if (open) {
      dictsApi.getTypes().then(setTypes).catch(() => {});
      dictsApi.getTags().then(setTags).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open && itemId) {
      setLoading(true);
      itemsApi.getItem(itemId).then((data: any) => {
        setItem(data);
        const specObj: any = data.spec || {};
        setForm({
          name: data.name || '',
          sellingPrice: data.sellingPrice || 0,
          floorPrice: data.floorPrice || 0,
          counter: data.counter != null ? String(data.counter) : '',
          certNo: data.certNo || '',
          notes: data.notes || '',
          origin: data.origin || '',
          tagIds: data.tags ? data.tags.map((t: any) => t.id) : [],
          weight: specObj.weight || '',
          metalWeight: specObj.metalWeight || '',
          size: specObj.size || '',
          braceletSize: specObj.braceletSize || '',
          beadCount: specObj.beadCount || '',
          beadDiameter: specObj.beadDiameter || '',
          ringSize: specObj.ringSize || '',
        });
      }).catch(() => {
        toast.error('加载货品信息失败');
      }).finally(() => setLoading(false));
    } else {
      setItem(null);
    }
  }, [open, itemId]);

  const specFieldLabels: Record<string, string> = {
    weight: '克重(g)', metalWeight: '金重(g)', size: '尺寸', braceletSize: '圈口',
    beadCount: '颗数', beadDiameter: '珠径', ringSize: '戒圈',
  };

  const selectedType = types.find((t: any) => String(t.id) === String(item?.typeId));
  let specFields: string[] = [];
  try { specFields = selectedType?.specFields ? JSON.parse(selectedType.specFields) : []; } catch { specFields = []; }

  function toggleTag(tagId: number) {
    const ids = form.tagIds.includes(tagId) ? form.tagIds.filter(id => id !== tagId) : [...form.tagIds, tagId];
    setForm(f => ({ ...f, tagIds: ids }));
  }

  async function handleSave() {
    if (!itemId) return;
    setSaving(true);
    try {
      const spec: Record<string, any> = {};
      specFields.forEach(f => { if ((form as any)[f]) spec[f] = (form as any)[f]; });
      await itemsApi.updateItem(itemId, {
        name: form.name || undefined,
        sellingPrice: form.sellingPrice,
        floorPrice: form.floorPrice || undefined,
        counter: form.counter ? Number(form.counter) : undefined,
        certNo: form.certNo || undefined,
        notes: form.notes || undefined,
        origin: form.origin || undefined,
        spec: Object.keys(spec).length > 0 ? spec : undefined,
        tagIds: form.tagIds,
      });
      toast.success('货品更新成功！');
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || '更新失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑货品</DialogTitle>
          <DialogDescription>{item?.skuCode || ''}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3 py-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>
        ) : item ? (
          <div className="space-y-4 py-2">
            {/* Non-editable info */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded-lg">
              <div><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{item.skuCode}</span></div>
              <div><span className="text-muted-foreground">材质:</span> {item.materialName || '-'}</div>
              <div><span className="text-muted-foreground">器型:</span> {item.typeName || '-'}</div>
              <div><span className="text-muted-foreground">状态:</span> <StatusBadge status={item.status} /></div>
              <div><span className="text-muted-foreground">成本价:</span> {formatPrice(item.costPrice)}</div>
              <div><span className="text-muted-foreground">分摊成本:</span> {formatPrice(item.allocatedCost)}</div>
            </div>

            {/* Editable fields */}
            <div className="space-y-1"><Label className="text-xs">名称</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">售价</Label><Input type="number" value={form.sellingPrice || ''} onChange={e => setForm(f => ({ ...f, sellingPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">底价</Label><Input type="number" value={form.floorPrice || ''} onChange={e => setForm(f => ({ ...f, floorPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">产地</Label><Input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">柜台号</Label><Input value={form.counter} onChange={e => setForm(f => ({ ...f, counter: e.target.value }))} className="h-9" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">证书号</Label><Input value={form.certNo} onChange={e => setForm(f => ({ ...f, certNo: e.target.value }))} className="h-9" /></div>

            {/* Dynamic spec fields */}
            {specFields.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {specFields.map((field: string) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">{specFieldLabels[field] || field}</Label>
                    <Input
                      type={field === 'beadCount' ? 'number' : 'text'}
                      value={(form as any)[field] || ''}
                      onChange={e => setForm({ ...form, [field]: e.target.value })}
                      className="h-9"
                      placeholder={specFieldLabels[field] || field}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1"><Label className="text-xs">备注</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="可选" className="h-16" /></div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">标签</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.filter((t: any) => t.isActive).map((tag: any) => (
                    <label key={tag.id} className="flex items-center gap-1 cursor-pointer">
                      <Checkbox checked={form.tagIds.includes(tag.id)} onCheckedChange={() => toggleTag(tag.id)} />
                      <span className="text-xs">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">未找到货品信息</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700" disabled={saving || loading}>{saving ? '保存中...' : '保存修改'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== Batch Create Dialog ==========
function BatchCreateDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batchCode: '', materialId: '', typeId: '', quantity: 1, totalCost: 0,
    costAllocMethod: 'equal', supplierId: '', purchaseDate: '', notes: '',
  });

  useEffect(() => {
    if (open) {
      dictsApi.getMaterials().then(setMaterials).catch(() => {});
      dictsApi.getTypes().then(setTypes).catch(() => {});
      suppliersApi.getSuppliers().then((s: any) => setSuppliers(s?.items || s || [])).catch(() => {});
    }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      if (!form.batchCode) { toast.error('请输入批次编号'); setSaving(false); return; }
      if (!form.materialId) { toast.error('请选择材质'); setSaving(false); return; }
      if (!form.quantity || form.quantity < 1) { toast.error('请输入有效数量'); setSaving(false); return; }
      await batchesApi.createBatch({
        batchCode: form.batchCode,
        materialId: Number(form.materialId),
        typeId: form.typeId ? Number(form.typeId) : undefined,
        quantity: form.quantity,
        totalCost: form.totalCost || 0,
        costAllocMethod: form.costAllocMethod,
        supplierId: form.supplierId ? Number(form.supplierId) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        notes: form.notes || undefined,
      });
      toast.success('批次创建成功！');
      setForm({ batchCode: '', materialId: '', typeId: '', quantity: 1, totalCost: 0, costAllocMethod: 'equal', supplierId: '', purchaseDate: '', notes: '' });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || '创建失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>新建批次</DialogTitle><DialogDescription>创建新的通货批次</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1"><Label className="text-xs">批次编号 *</Label><Input value={form.batchCode} onChange={e => setForm(f => ({ ...f, batchCode: e.target.value }))} className="h-9" placeholder="如: HT-20260101-001" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">材质 *</Label>
              <Select value={form.materialId} onValueChange={v => setForm(f => ({ ...f, materialId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="选择材质" /></SelectTrigger>
                <SelectContent>{materials.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">器型</Label>
              <Select value={form.typeId} onValueChange={v => setForm(f => ({ ...f, typeId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="选择器型" /></SelectTrigger>
                <SelectContent>{types.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">数量 *</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} className="h-9" min={1} /></div>
            <div className="space-y-1"><Label className="text-xs">总成本 *</Label><Input type="number" value={form.totalCost || ''} onChange={e => setForm(f => ({ ...f, totalCost: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">分摊方式</Label>
              <Select value={form.costAllocMethod} onValueChange={v => setForm(f => ({ ...f, costAllocMethod: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">均摊</SelectItem>
                  <SelectItem value="by_weight">按克重</SelectItem>
                  <SelectItem value="by_price">按售价</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">供应商</Label>
              <Select value={form.supplierId} onValueChange={v => setForm(f => ({ ...f, supplierId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="选择供应商" /></SelectTrigger>
                <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">采购日期</Label><Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">备注</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-16" placeholder="可选" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>{saving ? '创建中...' : '创建批次'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== Bundle Sale Dialog ==========
function BundleSaleDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    selectedItemIds: [] as number[], totalPrice: 0, allocMethod: 'by_ratio',
    chainItemIds: [] as number[], channel: 'store', saleDate: new Date().toISOString().slice(0, 10),
    customerId: '', note: '',
  });

  useEffect(() => {
    if (open) {
      itemsApi.getItems({ status: 'in_stock', size: 200 }).then((d: any) => setItems(d?.items || [])).catch(() => {});
      customersApi.getCustomers({ size: 200 }).then((d: any) => setCustomers(d?.items || [])).catch(() => {});
    }
  }, [open]);

  function toggleItem(id: number) {
    const ids = form.selectedItemIds.includes(id) ? form.selectedItemIds.filter(i => i !== id) : [...form.selectedItemIds, id];
    const selected = items.filter(i => ids.includes(i.id));
    const total = selected.reduce((sum, i) => sum + (i.sellingPrice || 0), 0);
    setForm(f => ({ ...f, selectedItemIds: ids, totalPrice: total }));
  }

  function toggleChainItem(id: number) {
    const ids = form.chainItemIds.includes(id) ? form.chainItemIds.filter(i => i !== id) : [...form.chainItemIds, id];
    setForm(f => ({ ...f, chainItemIds: ids }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (form.selectedItemIds.length < 2) { toast.error('套装销售至少选择2件货品'); setSaving(false); return; }
      if (!form.totalPrice) { toast.error('请输入总价'); setSaving(false); return; }
      await salesApi.createBundleSale({
        itemIds: form.selectedItemIds,
        totalPrice: form.totalPrice,
        allocMethod: form.allocMethod,
        chainItemIds: form.allocMethod === 'chain_at_cost' ? form.chainItemIds : undefined,
        channel: form.channel,
        saleDate: form.saleDate,
        customerId: form.customerId ? Number(form.customerId) : undefined,
        note: form.note || undefined,
      });
      toast.success('套装销售成功！');
      setForm({ selectedItemIds: [], totalPrice: 0, allocMethod: 'by_ratio', chainItemIds: [], channel: 'store', saleDate: new Date().toISOString().slice(0, 10), customerId: '', note: '' });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || '套装销售失败');
    } finally {
      setSaving(false);
    }
  }

  const selectedItems = items.filter(i => form.selectedItemIds.includes(i.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>套装销售</DialogTitle><DialogDescription>多件货品打包一起销售</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          {/* Item Selection */}
          <div className="space-y-1">
            <Label className="text-xs">选择货品 (至少2件)</Label>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 custom-scrollbar">
              {items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">没有在库货品</p> : items.map(item => (
                <label key={item.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer text-sm">
                  <Checkbox checked={form.selectedItemIds.includes(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                  <span className="font-mono text-xs">{item.skuCode}</span>
                  <span className="flex-1 truncate">{item.name || item.typeName || '-'}</span>
                  <span className="text-emerald-600 font-medium">{formatPrice(item.sellingPrice)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Selected summary */}
          {selectedItems.length > 0 && (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-sm">
              <p className="font-medium">已选 {selectedItems.length} 件，标价合计: {formatPrice(form.totalPrice)}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">套装总价 *</Label><Input type="number" value={form.totalPrice || ''} onChange={e => setForm(f => ({ ...f, totalPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">分摊方式</Label>
              <Select value={form.allocMethod} onValueChange={v => setForm(f => ({ ...f, allocMethod: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="by_ratio">按售价比例</SelectItem>
                  <SelectItem value="chain_at_cost">链按售价+余入主件</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chain item selection */}
          {form.allocMethod === 'chain_at_cost' && selectedItems.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">链类货品 (按售价计入成本)</Label>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map(item => (
                  <label key={item.id} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={form.chainItemIds.includes(item.id)} onCheckedChange={() => toggleChainItem(item.id)} />
                    <span className="text-xs">{item.skuCode}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">销售渠道</Label>
              <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="store">门店</SelectItem><SelectItem value="wechat">微信</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">销售日期</Label><Input type="date" value={form.saleDate} onChange={e => setForm(f => ({ ...f, saleDate: e.target.value }))} className="h-9" /></div>
          </div>

          <div className="space-y-1"><Label className="text-xs">客户</Label>
            <Select value={form.customerId} onValueChange={v => setForm(f => ({ ...f, customerId: v }))}>
              <SelectTrigger className="h-9"><SelectValue placeholder="选择客户 (可选)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不选择</SelectItem>
                {customers.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.phone ? ` (${c.phone})` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1"><Label className="text-xs">备注</Label><Textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="h-16" placeholder="可选" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>{saving ? '处理中...' : '确认套装销售'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== Inventory Tab ==========
function InventoryTab() {
  const [items, setItems] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ materialId: '', status: 'in_stock', keyword: '', counter: '' });

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [detailItemId, setDetailItemId] = useState<number | null>(null);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [returnConfirmItem, setReturnConfirmItem] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [saleDialog, setSaleDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [saleForm, setSaleForm] = useState({ actualPrice: 0, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' });

  useEffect(() => { dictsApi.getMaterials().then(setMaterials).catch(() => {}); }, []);

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
    } catch {
      toast.error('加载库存失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filters]);

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

      {/* Filters + Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1"><Label className="text-xs">关键词</Label><Input placeholder="SKU/名称/证书" value={filters.keyword} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">材质</Label>
              <Select value={filters.materialId} onValueChange={v => setFilters(f => ({ ...f, materialId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="全部" /></SelectTrigger>
                <SelectContent><SelectItem value="all">全部材质</SelectItem>{materials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
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
              <Button size="sm" variant="outline" onClick={() => setFilters({ materialId: '', status: 'in_stock', keyword: '', counter: '' })} className="h-9">重置</Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => setShowCreate(true)}><Plus className="h-3 w-3 mr-1" />新增入库</Button>
            <a href={exportApi.inventory()} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-9"><FileDown className="h-3 w-3 mr-1" />导出</Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      {items.length === 0 ? (
        <EmptyState icon={Package} title="暂无货品" desc="还没有入库任何货品" />
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
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.skuCode}</TableCell>
                      <TableCell>{item.name || item.skuCode}</TableCell>
                      <TableCell>{item.materialName}</TableCell>
                      <TableCell>{item.typeName || '-'}</TableCell>
                      <TableCell className="text-right">{formatPrice(item.allocatedCost || item.costPrice)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatPrice(item.sellingPrice)}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell className={item.ageDays > 90 ? 'text-red-600 font-medium' : ''}>{item.ageDays != null ? `${item.ageDays}天` : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDetailItemId(item.id)} title="查看详情"><Eye className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-600" onClick={() => setEditItemId(item.id)} title="编辑"><Pencil className="h-3 w-3" /></Button>
                          {item.status === 'in_stock' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={() => { setSaleDialog({ open: true, item }); setSaleForm({ actualPrice: item.sellingPrice, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' }); }}>
                              <DollarSign className="h-3 w-3" /> 出库
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
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-amber-600" onClick={() => setEditItemId(item.id)}><Pencil className="h-3 w-3 mr-1" />编辑</Button>
                  {item.status === 'in_stock' && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-emerald-600" onClick={() => { setSaleDialog({ open: true, item }); setSaleForm({ actualPrice: item.sellingPrice, channel: 'store', saleDate: new Date().toISOString().slice(0, 10), note: '' }); }}>
                      <DollarSign className="h-3 w-3 mr-1" />出库
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
    </div>
  );
}

// ========== Sales Tab ==========
function SalesTab() {
  const [sales, setSales] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ channel: '', startDate: '', endDate: '' });
  const [showBundle, setShowBundle] = useState(false);

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

  useEffect(() => { fetchSales(); }, [fetchSales]);

  if (loading && sales.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
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
        <EmptyState icon={ShoppingCart} title="暂无销售记录" desc="还没有任何销售" />
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
                      <TableCell className={`text-right font-medium ${sale.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(sale.grossProfit)}</TableCell>
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

      {/* Bundle Sale Dialog */}
      <BundleSaleDialog open={showBundle} onOpenChange={setShowBundle} onSuccess={fetchSales} />
    </div>
  );
}

// ========== Batches Tab ==========
function BatchesTab() {
  const [batches, setBatches] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">总批次</p><p className="text-2xl font-bold">{pagination.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">已回本</p><p className="text-2xl font-bold text-emerald-600">{batches.filter(b => b.status === 'paid_back' || b.status === 'cleared').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">销售中</p><p className="text-2xl font-bold text-sky-600">{batches.filter(b => b.status === 'selling').length}</p></CardContent></Card>
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
                    <TableHead className="text-right">数量</TableHead><TableHead>分摊方式</TableHead><TableHead className="text-right">已售</TableHead>
                    <TableHead className="text-right">已回款</TableHead><TableHead>回本进度</TableHead><TableHead>状态</TableHead>
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
                      <TableCell><Badge variant="outline">{({ equal: '均摊', by_weight: '按克重', by_price: '按售价' } as any)[b.costAllocMethod] || b.costAllocMethod}</Badge></TableCell>
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

      {/* Batch Create Dialog */}
      <BatchCreateDialog open={showCreate} onOpenChange={setShowCreate} onSuccess={fetchBatches} />
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
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customersApi.getCustomers({ page: pagination.page, size: pagination.size, keyword });
      setCustomers(data.items || []);
      setPagination(data.pagination || { total: 0, page: 1, size: 20, pages: 0 });
    } catch { toast.error('加载客户失败'); } finally { setLoading(false); }
  }, [pagination.page, keyword]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    if (expandedCustomerId) {
      setDetailLoading(true);
      customersApi.getCustomerDetail(expandedCustomerId).then((data: any) => {
        setCustomerDetail(data);
      }).catch(() => {
        toast.error('加载客户详情失败');
      }).finally(() => setDetailLoading(false));
    } else {
      setCustomerDetail(null);
    }
  }, [expandedCustomerId]);

  async function handleCreate() {
    try {
      await customersApi.createCustomer(createForm);
      toast.success('客户创建成功');
      setShowCreate(false);
      setCreateForm({ name: '', phone: '', wechat: '', notes: '' });
      fetchCustomers();
    } catch (e: any) { toast.error(e.message || '创建失败'); }
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{c.name}</h3>
                    <Badge variant="outline" className="text-xs">{c.customerCode}</Badge>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpandedCustomerId(expandedCustomerId === c.id ? null : c.id)}>
                    {expandedCustomerId === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {c.phone && <p>📞 {c.phone}</p>}
                  {c.wechat && <p>💬 {c.wechat}</p>}
                  {c.notes && <p className="truncate">📝 {c.notes}</p>}
                </div>

                {/* Expanded Detail */}
                {expandedCustomerId === c.id && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {detailLoading ? (
                      <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /></div>
                    ) : customerDetail ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">总消费</p>
                            <p className="font-bold text-emerald-600">
                              {customerDetail.saleRecords
                                ? formatPrice(customerDetail.saleRecords.reduce((sum: number, s: any) => sum + (s.actualPrice || 0), 0))
                                : '¥0.00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">购买次数</p>
                            <p className="font-bold">{customerDetail.saleRecords?.length || 0} 次</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">最近购买</p>
                            <p className="font-medium">{customerDetail.saleRecords?.length > 0
                              ? customerDetail.saleRecords.sort((a: any, b: any) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())[0]?.saleDate
                              : '无'}</p>
                          </div>
                        </div>
                        {customerDetail.saleRecords && customerDetail.saleRecords.length > 0 && (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                            <p className="text-xs font-medium text-muted-foreground">购买记录</p>
                            {customerDetail.saleRecords.slice(0, 10).map((sr: any) => (
                              <div key={sr.id} className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">{sr.item?.skuCode || sr.saleNo}</span>
                                  <Badge variant="outline" className="text-[10px] h-4">{sr.channel === 'store' ? '门店' : '微信'}</Badge>
                                </div>
                                <span className="font-medium text-emerald-600">{formatPrice(sr.actualPrice)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">无法加载详情</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增客户</DialogTitle></DialogHeader>
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
          dictsApi.getMaterials(true), dictsApi.getTypes(true), dictsApi.getTags(undefined, true),
          configApi.getConfig(), suppliersApi.getSuppliers(),
        ]);
        setMaterials(m || []);
        setTypes(t || []);
        setTags(tg || []);
        setConfigs(c || []);
        setSuppliers(s?.items || []);
      } catch { toast.error('加载设置数据失败'); } finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  async function toggleMaterialActive(id: number, isActive: boolean) {
    try { await dictsApi.updateMaterial(id, { isActive: !isActive }); setMaterials(m => m.map(x => x.id === id ? { ...x, isActive: !isActive } : x)); toast.success(isActive ? '已停用' : '已启用'); } catch (e: any) { toast.error(e.message); }
  }

  async function updateConfig(key: string, value: string) {
    try { await configApi.updateConfig(key, value); setConfigs(c => c.map(x => x.key === key ? { ...x, value } : x)); toast.success('配置已更新'); } catch (e: any) { toast.error(e.message); }
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
          <Card>
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">材质 ({materials.length})</CardTitle></div></CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>子类</TableHead><TableHead>产地</TableHead><TableHead className="text-right">克重单价</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {materials.map(m => (
                      <TableRow key={m.id} className={!m.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{m.subType || '-'}</TableCell>
                        <TableCell>{m.origin || '-'}</TableCell>
                        <TableCell className="text-right">{m.costPerGram ? `¥${m.costPerGram}` : '-'}</TableCell>
                        <TableCell><Badge variant={m.isActive ? 'default' : 'secondary'} className={m.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : ''}>{m.isActive ? '启用' : '停用'}</Badge></TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleMaterialActive(m.id, m.isActive)}>{m.isActive ? '停用' : '启用'}</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                        <TableCell><Badge variant={t.isActive ? 'default' : 'secondary'} className={t.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : ''}>{t.isActive ? '启用' : '停用'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">标签 ({tags.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(tagGroups).map(([group, groupTags]: [string, any]) => (
                  <div key={group}>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {groupTags.map((tag: any) => (
                        <Badge key={tag.id} variant={tag.isActive ? 'default' : 'secondary'} className={tag.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'opacity-50'}>{tag.name}</Badge>
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
                    <Input type="number" className="w-28 h-8 text-sm" placeholder="更新单价"
                      onBlur={async (e) => {
                        const val = parseFloat(e.target.value);
                        if (val && val !== m.costPerGram) {
                          try { await metalApi.updatePrice({ materialId: m.id, pricePerGram: val }); setMaterials(ms => ms.map(x => x.id === m.id ? { ...x, costPerGram: val } : x)); toast.success(`${m.name}市价已更新为 ¥${val}/克`); } catch (e: any) { toast.error(e.message); }
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
                    <div><p className="font-medium">{c.description || c.key}</p><p className="text-xs text-muted-foreground font-mono">{c.key}</p></div>
                    <Input type="text" value={c.value} className="w-32 h-8 text-sm"
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
    <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 backdrop-blur-sm border-t border-border shadow-lg pb-safe z-50">
      <div className="flex items-center h-14">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
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

// ========== Desktop Top Navigation ==========
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
          <div className="flex space-x-1 flex-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${active ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                >
                  <Icon className="h-4 w-4" />{tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}

// ========== Main Page ==========
export default function JadeInventoryPage() {
  const { activeTab, setActiveTab } = useAppStore();
  const [animKey, setAnimKey] = useState(0);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setAnimKey(k => k + 1);
  };

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
      <DesktopNav activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="flex-1 px-4 py-4 md:px-6 md:py-6 pb-20 md:pb-6 max-w-7xl mx-auto w-full">
        <div key={animKey} className="tab-fade-in">
          {renderTab()}
        </div>
      </main>
      <MobileNav activeTab={activeTab} onTabChange={handleTabChange} />
      <footer className="mt-auto hidden md:block border-t border-border bg-card py-3">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Gem className="h-4 w-4 text-emerald-600" />玉器进销存管理系统</span>
          <span>Powered by Z.ai</span>
        </div>
      </footer>
    </div>
  );
}
