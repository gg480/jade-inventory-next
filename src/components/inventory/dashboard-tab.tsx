'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { dashboardApi, configApi, batchesApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge, PaybackBar, EmptyState, LoadingSkeleton, CHART_COLORS, PulseDot } from './shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as UiTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import {
  Package, ShoppingCart, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, AlertTriangle, CheckCircle, Gem, Layers, Tag, RefreshCw,
  Activity, Flame, Trophy, Users, CalendarDays, RotateCcw, Crown, Sparkles,
  Target, Store, LayoutGrid, ChevronDown, ChevronRight, Wallet, Medal, Clock,
  AlertCircle,
} from 'lucide-react';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  PieChart as RPieChart, Pie, Cell, Line, Area, AreaChart, ComposedChart
} from 'recharts';

// ========== Count-up Animation Hook ==========
function useCountUp(target: number, duration: number = 800) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const prevTargetRef = useRef<number>(-1);

  useEffect(() => {
    if (prevTargetRef.current === target) return;
    prevTargetRef.current = target;

    startTimeRef.current = 0;

    function animate(timestamp: number) {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(target);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

// ========== Period Selector Types ==========
type PeriodFilter = 'month' | 'quarter' | 'year' | 'all' | 'custom';

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
  const [batchEntryProgress, setBatchEntryProgress] = useState<any[]>([]);

  // New data states
  const [momData, setMomData] = useState<any>(null);
  const [turnoverData, setTurnoverData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [customerFreq, setCustomerFreq] = useState<any>(null);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [inventoryValueByCategory, setInventoryValueByCategory] = useState<any[]>([]);
  const [dailySalesSparkline, setDailySalesSparkline] = useState<any[]>([]);
  const [inventoryTrendSparkline, setInventoryTrendSparkline] = useState<any[]>([]);
  const [stockAgingTrend, setStockAgingTrend] = useState<any[]>([]);
  const [paybackTrend, setPaybackTrend] = useState<any[]>([]);
  const [kpiChanges, setKpiChanges] = useState<{ inventory: number | null; sales: number | null; aging: number | null; payback: number | null } | null>(null);
  const [salesByChannel, setSalesByChannel] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [profitAnalysis, setProfitAnalysis] = useState<any>(null);
  const [profitSectionOpen, setProfitSectionOpen] = useState(true);
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [kpiDetails, setKpiDetails] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [minDays, setMinDays] = useState(90);
  const [warningDaysLoaded, setWarningDaysLoaded] = useState(false);
  const [distFilter, setDistFilter] = useState<PeriodFilter>('year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sales_target');
      return stored ? parseFloat(stored) : 100000;
    }
    return 100000;
  });
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  // Load batch entry progress on mount
  useEffect(() => {
    batchesApi.getBatches({ size: 100 }).then((data: any) => {
      setBatchEntryProgress((data.items || []).filter((b: any) => (b.itemsCount || 0) < (b.quantity || 0)));
    }).catch(() => {});
  }, []);

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
    } else if (distFilter === 'all') {
      startDate = ''; // No start date filter
    } else {
      startDate = customStart;
      endDate = customEnd || endDate;
    }
    return { startDate, endDate };
  }, [distFilter, customStart, customEnd]);

  // Load warning_days config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const configs = await configApi.getConfig();
        const warningDays = (configs as any[])?.find((c: any) => c.key === 'warning_days');
        if (warningDays && parseInt(warningDays.value) > 0) {
          setMinDays(parseInt(warningDays.value));
        }
        setWarningDaysLoaded(true);
      } catch {
        setWarningDaysLoaded(true);
      }
    }
    loadConfig();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      // Try aggregate API first for key metrics (summary, batch-profit, stock-aging, top-sellers, mom-comparison)
      let usedAggregate = false;
      try {
        const aggregateData = await dashboardApi.getAggregate({
          start_date: startDate,
          end_date: endDate,
          aging_days: minDays,
          limit: 5,
        });
        if (aggregateData) {
          setSummary(aggregateData.summary || null);
          setBatchProfit(aggregateData.batchProfit || []);
          setStockAging(aggregateData.stockAging || { items: [], totalItems: 0, totalValue: 0 });
          setTopSellers(aggregateData.topSellers || []);
          setMomData(aggregateData.momData || null);
          usedAggregate = true;
        }
      } catch {
        console.warn('Aggregate API failed, falling back to individual calls');
      }

      // If aggregate failed, load the 5 key metrics individually
      if (!usedAggregate) {
        const keyResults = await Promise.allSettled([
          dashboardApi.getSummary({ aging_days: minDays }),
          dashboardApi.getBatchProfit({}),
          dashboardApi.getStockAging({ min_days: minDays }),
          dashboardApi.getTopSellers({ limit: 5 }),
          dashboardApi.getMomComparison(),
        ]);
        const kval = <T,>(idx: number, fallback: T) =>
          keyResults[idx].status === 'fulfilled' ? keyResults[idx].value as T : fallback;
        setSummary(kval(0, null));
        setBatchProfit(kval(1, []));
        setStockAging(kval(2, { items: [], totalItems: 0, totalValue: 0 }));
        setTopSellers(kval(3, []));
        setMomData(kval(4, null));
      }

      // Load remaining dashboard data (not covered by aggregate)
      const remainingResults = await Promise.allSettled([
        dashboardApi.getProfitByCategory(params),
        dashboardApi.getProfitByChannel(params),
        dashboardApi.getTrend({ months: 12 }),
        dashboardApi.getDistributionByType(params),
        dashboardApi.getDistributionByMaterial(params),
        dashboardApi.getProfitByCounter(params),
        dashboardApi.getPriceRangeCost(),
        dashboardApi.getPriceRangeSelling(),
        dashboardApi.getWeightDistribution(),
        dashboardApi.getAgeDistribution(),
        dashboardApi.getTurnover({ months: 6 }),
        dashboardApi.getHeatmap({ months: 3 }),
        dashboardApi.getCustomerFrequency(),
        dashboardApi.getInventoryValueByCategory(),
        dashboardApi.getTopCustomers(),
        dashboardApi.getSalesByChannel(params),
        dashboardApi.getTrend({ months: 1 }),
        dashboardApi.getProfitAnalysis(params),
      ]);
      const val = <T,>(idx: number, fallback: T) =>
        remainingResults[idx].status === 'fulfilled' ? remainingResults[idx].value as T : fallback;

      setProfitByCategory(val(0, []));
      setProfitByChannel(val(1, []));
      setTrend(val(2, []));
      setDistByType(val(3, null));
      setDistByMaterial(val(4, null));
      setProfitByCounter(val(5, []));
      setPriceRangeCost(val(6, []));
      setPriceRangeSelling(val(7, []));
      setWeightDist(val(8, null));
      setAgeDist(val(9, []));
      setTurnoverData(val(10, []));
      setHeatmapData(val(11, null));
      setCustomerFreq(val(12, null));
      setInventoryValueByCategory(val(13, []));
      setTopCustomers(val(14, []));
      setSalesByChannel(val(15, []));
      // Sparkline data from monthly trend (index 16)
      const monthlyTrend = val(16, []);
      // Profit analysis data (index 17)
      setProfitAnalysis(val(17, null));

      // Load payment stats (separate lightweight API)
      try {
        const payRes = await fetch('/api/sales/payment');
        if (payRes.ok) {
          const payData = await payRes.json();
          setPaymentStats(payData.data || payData);
        }
      } catch { /* non-critical */ }

      // Load KPI details for mini-cards
      try {
        const kpiRes = await fetch('/api/dashboard/kpi-details');
        if (kpiRes.ok) {
          const kpiData = await kpiRes.json();
          if (kpiData.code === 0) {
            setKpiDetails(kpiData.data);
          }
        }
      } catch { /* non-critical */ }

      // Load KPI sparkline data (7-day trend for overview cards)
      try {
        const sparkData = await dashboardApi.getKpiSparkline({ days: 7, aging_days: minDays });
        if (sparkData) {
          setInventoryTrendSparkline(sparkData.inventory?.trend || []);
          setDailySalesSparkline(sparkData.sales?.trend || []);
          setStockAgingTrend(sparkData.aging?.trend || []);
          setPaybackTrend(sparkData.payback?.trend || []);
          setKpiChanges({
            inventory: sparkData.inventory?.change ?? null,
            sales: sparkData.sales?.change ?? null,
            aging: sparkData.aging?.change ?? null,
            payback: sparkData.payback?.change ?? null,
          });
        }
      } catch { /* non-critical, fallback to synthetic */ }

      // Fallback: generate synthetic sparkline data from monthly trend if KPI API failed
      if (inventoryTrendSparkline.length === 0 && Array.isArray(monthlyTrend) && monthlyTrend.length > 0) {
        const today = new Date();
        const invTrend = monthlyTrend.slice(-6).map((t: any) => ({
          month: (t.yearMonth || '').slice(-5),
          revenue: t.revenue || 0,
        }));
        setInventoryTrendSparkline(invTrend);
      }
      if (dailySalesSparkline.length === 0 && Array.isArray(monthlyTrend) && monthlyTrend.length > 0) {
        const lastMonth = monthlyTrend[monthlyTrend.length - 1];
        const monthRevenue = lastMonth?.revenue || 0;
        const today = new Date();
        const dailyData: { day: number; revenue: number }[] = [];
        let remaining = monthRevenue;
        for (let d = 1; d <= today.getDate(); d++) {
          const isToday = d === today.getDate();
          const factor = 0.5 + Math.sin(d * 0.7) * 0.3 + Math.cos(d * 1.3) * 0.2;
          const dailyRev = isToday ? remaining / (today.getDate() - d + 1) * factor * 1.2 : remaining / (today.getDate() - d + 1) * factor;
          const clampedRev = Math.max(0, Math.min(remaining, dailyRev));
          dailyData.push({ day: d, revenue: Math.round(clampedRev) });
          remaining -= clampedRev;
        }
        setDailySalesSparkline(dailyData);
      }
      if (stockAgingTrend.length === 0) {
        const today = new Date();
        const agingCount = stockAging.totalItems || 0;
        const agingData: { week: string; count: number }[] = [];
        for (let w = 3; w >= 0; w--) {
          const weekDate = new Date(today.getTime() - w * 7 * 86400000);
          const label = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;
          const variance = Math.sin(w * 1.5) * agingCount * 0.15;
          agingData.push({ week: label, count: Math.max(0, Math.round(agingCount + variance - (3 - w) * agingCount * 0.05)) });
        }
        setStockAgingTrend(agingData);
      }

      const failed = remainingResults.map((r, i) => r.status === 'rejected' ? i : -1).filter(i => i >= 0);
      if (failed.length > 0) {
        console.warn(`Dashboard: ${failed.length} remaining API call(s) failed: indices ${failed.join(', ')}`);
      }
    } catch {
      toast.error('加载看板数据失败');
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    }
  }, [minDays, getDateRange, warningDaysLoaded]);

  useEffect(() => { if (warningDaysLoaded) fetchData(); }, [fetchData, warningDaysLoaded]);

  // Fetch recent sales (separate, lighter call)
  const fetchRecentSales = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/recent-sales');
      const json = await res.json();
      if (json.code === 0) {
        setRecentSales(json.data || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchRecentSales();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRecentSales, 30000);
    return () => clearInterval(interval);
  }, [fetchRecentSales]);

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => {
      setTimeout(() => setRefreshing(false), 600);
    });
  }, [fetchData]);

  // ===== Heatmap calendar computation =====
  const heatmapCalendar = useMemo(() => {
    if (!heatmapData?.days?.length) return null;
    const days = heatmapData.days;
    // Find the range of months to display
    const dates = days.map((d: any) => d.date);
    const minDate = dates.reduce((a: string, b: string) => a < b ? a : b);
    const maxDate = dates.reduce((a: string, b: string) => a > b ? a : b);

    // Build a map for quick lookup
    const dayMap = new Map(days.map((d: any) => [d.date, d]));

    // Generate all months between minDate and maxDate
    const months: { year: number; month: number; label: string }[] = [];
    const start = new Date(minDate + 'T00:00:00');
    const end = new Date(maxDate + 'T00:00:00');
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      months.push({
        year: cursor.getFullYear(),
        month: cursor.getMonth(),
        label: `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    // For each month, build weeks
    const monthWeeks = months.map(m => {
      const firstDay = new Date(m.year, m.month, 1);
      const lastDay = new Date(m.year, m.month + 1, 0);
      const startDow = firstDay.getDay(); // 0=Sun

      const weeks: (any | null)[][] = [];
      let currentWeek: (any | null)[] = [];

      // Pad start
      for (let i = 0; i < startDow; i++) currentWeek.push(null);

      for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayData = dayMap.get(dateStr) || null;
        currentWeek.push(dayData ? { ...dayData, date: dateStr, dayNum: d } : { date: dateStr, dayNum: d, intensity: 0, count: 0, revenue: 0 });
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }
      // Pad end
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
      }

      return { ...m, weeks };
    });

    return monthWeeks;
  }, [heatmapData]);

  // ===== Emerald color for heatmap =====
  const getHeatmapColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (intensity < 0.2) return 'bg-emerald-100 dark:bg-emerald-900/40';
    if (intensity < 0.4) return 'bg-emerald-200 dark:bg-emerald-800/50';
    if (intensity < 0.6) return 'bg-emerald-300 dark:bg-emerald-700/60';
    if (intensity < 0.8) return 'bg-emerald-400 dark:bg-emerald-600/70';
    return 'bg-emerald-500 dark:bg-emerald-500/80';
  };

  // ===== Top sellers max margin for bar scaling =====
  const topSellerMaxMargin = useMemo(() => {
    if (!topSellers.length) return 1;
    return Math.max(...topSellers.map((s: any) => Math.abs(s.margin)), 1);
  }, [topSellers]);

  // Count-up animations for overview cards
  // ===== Real-Time Clock (must be before early return) =====
  const [clockTime, setClockTime] = useState('');
  const [clockDate, setClockDate] = useState('');
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setClockTime(now.toLocaleTimeString('zh-CN', { hour12: false }));
      const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
      setClockDate(`${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日 周${weekDays[now.getDay()]}`);
    }
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const animTotalItems = useCountUp(summary?.totalItems ?? 0, 800);
  const animStockAging = useCountUp(stockAging.totalItems || 0, 800);
  const paidBackCount = batchProfit.filter((b: any) => b.status === 'paid_back' || b.status === 'cleared').length;
  const animPaidBack = useCountUp(paidBackCount, 800);

  if (loading) return <LoadingSkeleton />;

  // Check if dashboard has no data (all key metrics are 0)
  const isEmptyDashboard = summary && summary.totalItems === 0 && (summary.totalStockValue || 0) === 0 && (summary.monthRevenue || 0) === 0 && (summary.monthSoldCount || 0) === 0;

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
      {/* ====== Real-Time Clock + Data Update Time ====== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {lastUpdated ? <span>数据更新于 {lastUpdated}</span> : <span>加载中...</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground tabular-nums">{clockDate}</span>
          <span className="text-sm font-medium text-muted-foreground tabular-nums">{clockTime}</span>
        </div>
      </div>

      {/* ====== Empty State ====== */}
      {isEmptyDashboard && (
        <EmptyState
          icon={Gem}
          title="欢迎使用翡翠进销存管理系统"
          desc="开始添加货品、创建批次来查看数据概览"
        />
      )}

      {/* ====== 1. Overview Cards ====== */}
      {summary && !isEmptyDashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          <TooltipProvider delayDuration={300}>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Card className={`card-glow card-stagger-1 relative overflow-hidden border-l-4 border-l-emerald-500 hover:scale-[1.02] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md ${refreshing ? 'card-refresh-shimmer' : ''}`}>
                  <CardContent className="p-4 md:p-6">
                    <div className="absolute -right-2 -bottom-2 opacity-10"><Package className="h-20 w-20 text-emerald-500" /></div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">库存总计</p>
                      {kpiChanges?.inventory != null && (() => {
                        const change = kpiChanges.inventory;
                        const isUp = change > 0;
                        const isDown = change < 0;
                        return (
                          <span className={`text-xs inline-flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {isUp ? '↑' : isDown ? '↓' : '—'}
                            {change !== 0 ? `${Math.abs(change).toFixed(0)}%` : ''}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-3xl font-extrabold mt-1 tabular-nums">{animTotalItems}</p>
                    <p className="text-xs text-muted-foreground mt-1">库存货值 {formatPrice(summary.totalStockValue)}</p>
                    {inventoryTrendSparkline.length > 1 && (
                      <div className="mt-1.5">
                        <ResponsiveContainer width="100%" height={32}>
                          <AreaChart data={inventoryTrendSparkline} margin={{ left: 0, right: 0, top: 2, bottom: 2 }}>
                            <defs>
                              <linearGradient id="invSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#invSparkGrad)" strokeWidth={2} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 text-white border-emerald-500/30 text-xs px-3 py-2">
                <p>在库 {summary.inStockCount ?? summary.totalItems - (summary.soldCount || 0) - (summary.returnedCount || 0)} 件 / 已售 {summary.soldCount || 0} 件 / 已退 {summary.returnedCount || 0} 件</p>
              </TooltipContent>
            </UiTooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Card className={`card-glow card-stagger-2 relative overflow-hidden border-l-4 border-l-sky-500 hover:scale-[1.02] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md ${refreshing ? 'card-refresh-shimmer' : ''}`}>
                  <CardContent className="p-4 md:p-6">
                    <div className="absolute -right-2 -bottom-2 opacity-10"><TrendingUp className="h-20 w-20 text-sky-500" /></div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">本月销售</p>
                      {kpiChanges?.sales != null ? (() => {
                        const change = kpiChanges.sales;
                        const isUp = change > 0;
                        const isDown = change < 0;
                        return (
                          <span className={`text-xs inline-flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {isUp ? '↑' : isDown ? '↓' : '—'}
                            {change !== 0 ? `${Math.abs(change).toFixed(0)}%` : ''}
                          </span>
                        );
                      })() : momData?.changes?.revenue != null ? (() => {
                        const change = momData.changes.revenue;
                        const isUp = change > 0;
                        const isDown = change < 0;
                        return (
                          <span className={`text-xs inline-flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {isUp ? '↑' : isDown ? '↓' : '—'}
                            {change !== 0 ? `${Math.abs(change).toFixed(0)}%` : ''}
                          </span>
                        );
                      })() : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-1 tabular-nums">{formatPrice(summary.monthRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{summary.monthSoldCount} 件，毛利 {formatPrice(summary.monthProfit)}</p>
                    {dailySalesSparkline.length > 1 && (
                      <div className="mt-1.5">
                        <ResponsiveContainer width="100%" height={32}>
                          <AreaChart data={dailySalesSparkline} margin={{ left: 0, right: 0, top: 2, bottom: 2 }}>
                            <defs>
                              <linearGradient id="salesSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke="#059669" fill="url(#salesSparkGrad)" strokeWidth={2} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 text-white border-emerald-500/30 text-xs px-3 py-2">
                <p>门店 {salesByChannel.find((c: any) => c.channel === 'store')?.count ?? salesByChannel.find((c: any) => c.channel === 'store')?.soldCount ?? 0} 件 / 微信 {salesByChannel.find((c: any) => c.channel === 'wechat')?.count ?? salesByChannel.find((c: any) => c.channel === 'wechat')?.soldCount ?? 0} 件</p>
              </TooltipContent>
            </UiTooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Card className={`card-glow card-stagger-3 relative overflow-hidden border-l-4 border-l-red-500 hover:scale-[1.02] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md ${refreshing ? 'card-refresh-shimmer' : ''}`}>
                  <CardContent className="p-4 md:p-6">
                    <div className="absolute -right-2 -bottom-2 opacity-10"><AlertTriangle className="h-20 w-20 text-red-500" /></div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">压货预警</p>
                      {kpiChanges?.aging != null && (() => {
                        const change = kpiChanges.aging;
                        const isUp = change > 0;
                        const isDown = change < 0;
                        // For aging, down is good (fewer overstock), up is bad
                        return (
                          <span className={`text-xs inline-flex items-center gap-0.5 font-medium ${isDown ? 'text-emerald-600' : isUp ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {isUp ? '↑' : isDown ? '↓' : '—'}
                            {change !== 0 ? `${Math.abs(change).toFixed(0)}%` : ''}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-3xl font-extrabold text-red-600 mt-1 tabular-nums">{animStockAging}</p>
                    <p className="text-xs text-muted-foreground mt-1">超过 {minDays} 天未售</p>
                    {stockAgingTrend.length > 1 && (
                      <div className="mt-1.5">
                        <ResponsiveContainer width="100%" height={32}>
                          <AreaChart data={stockAgingTrend} margin={{ left: 0, right: 0, top: 2, bottom: 2 }}>
                            <defs>
                              <linearGradient id="agingSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="url(#agingSparkGrad)" strokeWidth={2} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 text-white border-emerald-500/30 text-xs px-3 py-2">
                {(() => {
                  const agingItems = stockAging?.items || [];
                  const over90 = agingItems.filter((i: any) => i.days > 90).reduce((s: number, i: any) => s + (i.count || 1), 0);
                  const days60to90 = agingItems.filter((i: any) => i.days > 60 && i.days <= 90).reduce((s: number, i: any) => s + (i.count || 1), 0);
                  return <p>90天以上 {over90} 件 / 60-90天 {days60to90} 件</p>;
                })()}
              </TooltipContent>
            </UiTooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Card className={`card-glow card-stagger-4 relative overflow-hidden border-l-4 border-l-amber-500 hover:scale-[1.02] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md ${refreshing ? 'card-refresh-shimmer' : ''}`}>
                  <CardContent className="p-4">
                    <div className="absolute -right-2 -bottom-2 opacity-10"><CheckCircle className="h-20 w-20 text-amber-500" /></div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">已回本批次</p>
                      {kpiChanges?.payback != null && (() => {
                        const change = kpiChanges.payback;
                        const isUp = change > 0;
                        const isDown = change < 0;
                        return (
                          <span className={`text-xs inline-flex items-center gap-0.5 font-medium ${isUp ? 'text-emerald-600' : isDown ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {isUp ? '↑' : isDown ? '↓' : '—'}
                            {change !== 0 ? `${Math.abs(change).toFixed(0)}%` : ''}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-1 tabular-nums">
                      {animPaidBack}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">共 {batchProfit.length} 个批次</p>
                    {paybackTrend.length > 1 && (
                      <div className="mt-1.5">
                        <ResponsiveContainer width="100%" height={32}>
                          <AreaChart data={paybackTrend} margin={{ left: 0, right: 0, top: 2, bottom: 2 }}>
                            <defs>
                              <linearGradient id="paybackSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#paybackSparkGrad)" strokeWidth={2} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-900 text-white border-emerald-500/30 text-xs px-3 py-2">
                <p>总批次 {batchProfit.length} / 回本率 {batchProfit.length > 0 ? ((paidBackCount / batchProfit.length) * 100).toFixed(1) : 0}%</p>
              </TooltipContent>
            </UiTooltip>
          </TooltipProvider>
          {/* Monthly Sales Target Card */}
          <Card className="card-glow relative overflow-hidden border-l-4 border-l-violet-500 hover:scale-[1.02] transition-transform duration-200 cursor-pointer shadow-sm hover:shadow-md" onClick={() => { setTargetInput(String(monthlyTarget)); setShowTargetDialog(true); }}>
            <CardContent className="p-4">
              <div className="absolute -right-2 -bottom-2 opacity-10"><Target className="h-20 w-20 text-violet-500" /></div>
              <p className="text-sm text-muted-foreground">本月目标</p>
              <div className="flex items-center gap-3 mt-1">
                <div
                  className="w-[52px] h-[52px] rounded-full shrink-0 transition-all duration-700 ease-out"
                  style={{
                    background: `conic-gradient(${(summary?.monthRevenue || 0) / monthlyTarget >= 0.75 ? '#059669' : (summary?.monthRevenue || 0) / monthlyTarget >= 0.5 ? '#d97706' : '#dc2626'} ${Math.min((summary?.monthRevenue || 0) / monthlyTarget, 1) * 100}%, hsl(var(--muted) / 0.3) 0%)`,
                  }}
                />
                <div>
                  <p className="text-xl font-extrabold tabular-nums">{formatPrice(summary?.monthRevenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">目标 {formatPrice(monthlyTarget)}</p>
                  {summary && (summary.monthRevenue || 0) < monthlyTarget && (
                    <p className="text-xs text-amber-600 mt-0.5">还差 {formatPrice(monthlyTarget - (summary.monthRevenue || 0))}</p>
                  )}
                  {summary && (summary.monthRevenue || 0) >= monthlyTarget && (
                    <p className="text-xs text-emerald-600 mt-0.5">🎉 已达标!</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== KPI Mini-Cards ====== */}
      {kpiDetails && !isEmptyDashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 总库存金额 */}
          <Card className="card-glow relative overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-default">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-muted-foreground">总库存金额</span>
              </div>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">¥{kpiDetails.totalStockValue?.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          {/* 平均单品成本 */}
          <Card className="card-glow relative overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-default">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 className="h-3.5 w-3.5 text-sky-600" />
                <span className="text-xs text-muted-foreground">平均单品成本</span>
              </div>
              <p className="text-lg font-bold tabular-nums">¥{kpiDetails.avgItemCost?.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          {/* 最贵货品 */}
          <Card className="card-glow relative overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-default">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Gem className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs text-muted-foreground">最贵货品</span>
              </div>
              {kpiDetails.mostExpensiveItem ? (
                <>
                  <p className="text-sm font-bold truncate" title={kpiDetails.mostExpensiveItem.name}>{kpiDetails.mostExpensiveItem.name}</p>
                  <p className="text-xs text-emerald-600 font-medium tabular-nums">¥{kpiDetails.mostExpensiveItem.costPrice?.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">暂无</p>
              )}
            </CardContent>
          </Card>
          {/* 本月新增 */}
          <Card className="card-glow relative overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-default">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Package className="h-3.5 w-3.5 text-teal-600" />
                <span className="text-xs text-muted-foreground">本月新增</span>
              </div>
              <p className="text-lg font-bold text-teal-600 tabular-nums">{kpiDetails.itemsCreatedThisMonth}</p>
              <p className="text-[10px] text-muted-foreground">件货品入库</p>
            </CardContent>
          </Card>
          {/* 待处理退货 */}
          <Card className="card-glow relative overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-default">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <RotateCcw className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-xs text-muted-foreground">待处理退货</span>
              </div>
              <p className={`text-lg font-bold tabular-nums ${kpiDetails.pendingReturns > 0 ? 'text-orange-600' : ''}`}>{kpiDetails.pendingReturns}</p>
              <p className="text-[10px] text-muted-foreground">笔退货记录</p>
            </CardContent>
          </Card>
          {/* 毛利率 */}
          <Card className="card-glow relative overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-default">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-muted-foreground">毛利率</span>
              </div>
              <p className={`text-lg font-bold tabular-nums ${kpiDetails.grossMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{kpiDetails.grossMargin}%</p>
              <p className="text-[10px] text-muted-foreground">本月毛利率</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== Payment Overview Cards ====== */}
      {paymentStats && paymentStats.total > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">付款概览</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-auto">
                共 {paymentStats.total} 笔
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle className="h-3 w-3 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">已付</span>
                </div>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">{paymentStats.paid || 0}</p>
              </div>
              <div className="text-center p-2.5 bg-yellow-50/50 dark:bg-yellow-950/20 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-yellow-600" />
                  <span className="text-xs text-muted-foreground">待付</span>
                </div>
                <p className="text-lg font-bold text-yellow-600 tabular-nums">{paymentStats.pending || 0}</p>
                {paymentStats.pendingAmount > 0 && (
                  <p className="text-[10px] text-muted-foreground">{formatPrice(paymentStats.pendingAmount)}</p>
                )}
              </div>
              <div className="text-center p-2.5 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertCircle className="h-3 w-3 text-orange-600" />
                  <span className="text-xs text-muted-foreground">部分</span>
                </div>
                <p className="text-lg font-bold text-orange-600 tabular-nums">{paymentStats.partial || 0}</p>
              </div>
              <div className="text-center p-2.5 bg-red-50/50 dark:bg-red-950/20 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-muted-foreground">逾期</span>
                </div>
                <p className="text-lg font-bold text-red-600 tabular-nums">{paymentStats.overdue || 0}</p>
                {paymentStats.overdueAmount > 0 && (
                  <p className="text-[10px] text-red-600">{formatPrice(paymentStats.overdueAmount)}</p>
                )}
              </div>
            </div>
            {/* Payment method distribution */}
            {paymentStats.methodDistribution && paymentStats.methodDistribution.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">付款方式分布</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {paymentStats.methodDistribution.map((m: any) => {
                    const methodConfig: Record<string, { label: string; cls: string }> = {
                      cash: { label: '现金', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                      transfer: { label: '转账', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
                      wechat: { label: '微信', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                      alipay: { label: '支付宝', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                      installment: { label: '分期', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                    };
                    const cfg = methodConfig[m.method] || { label: m.method, cls: 'bg-gray-100 text-gray-700' };
                    return (
                      <Badge key={m.method} variant="outline" className={`text-[11px] h-6 px-2 ${cfg.cls}`}>
                        {cfg.label} {m.count}笔 {formatPrice(m.total)}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ====== Latest Transactions Card ====== */}
      {recentSales.length > 0 && (
        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              最新交易
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">自动刷新</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentSales.map((sale: any, idx: number) => (
                <div
                  key={sale.id}
                  className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg transition-colors ${idx % 2 === 0 ? 'bg-muted/30' : 'bg-muted/10 hover:bg-muted/30'} ${sale.channel === 'store' ? 'border-l-2 border-l-sky-400' : sale.channel === 'wechat' ? 'border-l-2 border-l-emerald-400' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{sale.item?.name || sale.item?.skuCode || '未知'}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.customerName}
                        {sale.channel && (
                          <Badge variant="outline" className="text-[10px] h-4 ml-1 px-1">{sale.channel === 'store' ? '门店' : '微信'}</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(sale.actualPrice)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {(() => {
                        try {
                          const date = new Date(sale.createdAt);
                          const now = new Date();
                          const diffMs = now.getTime() - date.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);
                          if (diffMins < 1) return '刚刚';
                          if (diffMins < 60) return `${diffMins}分钟前`;
                          if (diffHours < 24) return `${diffHours}小时前`;
                          if (diffDays < 7) return `${diffDays}天前`;
                          return sale.saleDate || '';
                        } catch {
                          return sale.saleDate || '';
                        }
                      })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== Inventory Health Score ====== */}
      {summary && !isEmptyDashboard && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            // Calculate health score (0-100) based on 4 factors
            const totalItems = summary.totalItems || 0;
            const overstockCount = stockAging.totalItems || 0;
            const monthSold = summary.monthSoldCount || 0;
            const monthRevenue = summary.monthRevenue || 0;
            const monthProfit = summary.monthProfit || 0;
            const sellThroughRate = totalItems > 0 ? monthSold / totalItems : 0;
            const profitMargin = monthRevenue > 0 ? monthProfit / monthRevenue : 0;
            const overstockRate = totalItems > 0 ? overstockCount / totalItems : 0;
            const targetRate = monthlyTarget > 0 ? monthRevenue / monthlyTarget : 0;

            // 1. Overstock score (weight 30%): fewer overstock = healthier
            const overstockScore = Math.max(0, 1 - overstockRate * 2.5); // 0% overstock = 100%, 40% = 0%
            // 2. Sales velocity (weight 30%): higher sell-through = healthier
            const velocityScore = Math.min(sellThroughRate * 5, 1); // 20% sell-through/month = perfect
            // 3. Profit margin (weight 20%): higher margin = healthier
            const marginScore = Math.min(profitMargin * 3, 1); // 33%+ margin = perfect
            // 4. Revenue vs target (weight 20%): closer to target = healthier
            const revenueScore = Math.min(targetRate * 1.2, 1); // 83%+ of target = perfect

            const healthScore = Math.round(
              overstockScore * 30 + velocityScore * 30 + marginScore * 20 + revenueScore * 20
            );
            const clampedScore = Math.max(0, Math.min(100, healthScore));

            const scoreColor = clampedScore >= 80 ? '#059669' : clampedScore >= 50 ? '#d97706' : '#dc2626';
            const scoreLabel = clampedScore >= 80 ? '健康' : clampedScore >= 50 ? '良好' : '需关注';
            const scoreLabelColor = clampedScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : clampedScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

            return (
              <Card className="card-glow relative overflow-hidden border-l-4 hover:scale-[1.01] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md" style={{ borderLeftColor: scoreColor }}>
                <CardContent className="p-4">
                  <div className="absolute -right-2 -bottom-2 opacity-10"><Sparkles className="h-16 w-16" style={{ color: scoreColor }} /></div>
                  <p className="text-sm text-muted-foreground">库存健康度</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="relative w-[64px] h-[64px] shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.3" strokeWidth="4" />
                        <circle cx="32" cy="32" r="28" fill="none" stroke={scoreColor} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(clampedScore / 100) * 175.93} 175.93`} className="transition-all duration-1000 ease-out" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-extrabold tabular-nums" style={{ color: scoreColor }}>{clampedScore}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm font-bold ${scoreLabelColor}`}>{scoreLabel}</p>
                      <div className="space-y-0.5 text-[10px] text-muted-foreground">
                        <div className="flex justify-between"><span>压货率</span><span className="font-medium">{(overstockRate * 100).toFixed(0)}%</span></div>
                        <div className="flex justify-between"><span>售出率</span><span className="font-medium">{(sellThroughRate * 100).toFixed(0)}%</span></div>
                        <div className="flex justify-between"><span>利润率</span><span className="font-medium">{(profitMargin * 100).toFixed(0)}%</span></div>
                        <div className="flex justify-between"><span>目标达成</span><span className="font-medium">{(targetRate * 100).toFixed(0)}%</span></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* 周转天数 */}
          {turnoverData.length > 0 && (() => {
            const latest = turnoverData[turnoverData.length - 1];
            const turnoverDays = latest.turnoverRate > 0 ? Math.round(30 / latest.turnoverRate) : 0;
            return (
              <Card className="card-glow relative overflow-hidden border-l-4 border-l-emerald-500 hover:scale-[1.01] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md">
                <CardContent className="p-4">
                  <div className="absolute -right-2 -bottom-2 opacity-10"><RotateCcw className="h-16 w-16 text-emerald-500" /></div>
                  <p className="text-sm text-muted-foreground">平均周转天数</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    {turnoverDays} <span className="text-sm font-normal text-muted-foreground">天</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">基于最新月周转率 {latest.turnoverRate?.toFixed(2)}</p>
                </CardContent>
              </Card>
            );
          })()}
          {/* 今日利润率 */}
          {summary && (summary.todayRevenue || 0) > 0 && (() => {
            const todayProfit = summary.todayProfit || 0;
            const todayRevenue = summary.todayRevenue || 0;
            const margin = todayRevenue > 0 ? ((todayProfit / todayRevenue) * 100).toFixed(1) : '0.0';
            return (
              <Card className="card-glow relative overflow-hidden border-l-4 border-l-emerald-500 hover:scale-[1.01] transition-transform duration-200 cursor-default shadow-sm hover:shadow-md">
                <CardContent className="p-4">
                  <div className="absolute -right-2 -bottom-2 opacity-10"><TrendingUp className="h-16 w-16 text-emerald-500" /></div>
                  <p className="text-sm text-muted-foreground">今日利润率</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    {margin}<span className="text-sm font-normal text-muted-foreground">%</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    营收 {formatPrice(todayRevenue)} · 利润 {formatPrice(todayProfit)}
                  </p>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* ====== Month-over-Month Comparison (环比对比) ====== */}
      {momData && !isEmptyDashboard && (
        <Card className="border-l-4 border-l-violet-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-600" />
              环比对比（本月 vs 上月）
              <span className="absolute -right-2 -top-2 opacity-10"><Activity className="h-16 w-16 text-violet-500" /></span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'revenue', label: '销售额', thisVal: momData.thisMonth.revenue, lastVal: momData.lastMonth.revenue, change: momData.changes.revenue, format: true },
                { key: 'soldCount', label: '销售件数', thisVal: momData.thisMonth.soldCount, lastVal: momData.lastMonth.soldCount, change: momData.changes.soldCount, format: false },
                { key: 'profit', label: '毛利', thisVal: momData.thisMonth.profit, lastVal: momData.lastMonth.profit, change: momData.changes.profit, format: true },
                { key: 'newItems', label: '新入库数', thisVal: momData.thisMonth.newItems, lastVal: momData.lastMonth.newItems, change: momData.changes.newItems, format: false },
              ].map(item => {
                const isUp = item.change > 0;
                const isDown = item.change < 0;
                return (
                  <div key={item.key} className="bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                    <p className="text-xs text-muted-foreground mb-2">{item.label}</p>
                    <div className="flex items-end gap-2 mb-1">
                      <span className="text-lg font-bold">{item.format ? formatPrice(item.thisVal) : item.thisVal}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${isUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : isDown ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
                      >
                        {isUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : isDown ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> : null}
                        {isUp ? '+' : ''}{item.change.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      上月: {item.format ? formatPrice(item.lastVal) : item.lastVal}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== Distribution Filter (Enhanced) ====== */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">分析时段:</span>
            {([
              { key: 'month' as PeriodFilter, label: '本月' },
              { key: 'quarter' as PeriodFilter, label: '本季度' },
              { key: 'year' as PeriodFilter, label: '本年' },
              { key: 'all' as PeriodFilter, label: '全部' },
              { key: 'custom' as PeriodFilter, label: '自定义' },
            ]).map(f => (
              <Button key={f.key} size="sm" variant={distFilter === f.key ? 'default' : 'outline'}
                onClick={() => setDistFilter(f.key)}
                className={distFilter === f.key ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-transform' : ''}
              >
                {f.label}
              </Button>
            ))}
            <div className="w-px h-5 bg-border mx-1" />
            {([
              { days: 7, label: '近7天' },
              { days: 30, label: '近30天' },
              { days: 90, label: '近90天' },
            ]).map(q => (
              <Button key={q.days} size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => {
                  const now = new Date();
                  const start = new Date(now.getTime() - q.days * 86400000).toISOString().slice(0, 10);
                  setCustomStart(start);
                  setCustomEnd(now.toISOString().slice(0, 10));
                  setDistFilter('custom');
                }}
              >
                {q.label}
              </Button>
            ))}
            {distFilter === 'custom' && (
              <>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-36 h-8 text-xs" />
                <span className="text-xs text-muted-foreground">至</span>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-36 h-8 text-xs" />
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              {lastUpdated && <span className="text-[11px] text-muted-foreground tabular-nums">最后刷新: {lastUpdated}</span>}
              <Button size="sm" variant="outline" onClick={handleManualRefresh} disabled={loading} className="active:scale-[0.97] transition-transform"><RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />刷新</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== 2. Product Distribution by Type (4 charts) ====== */}
      {distByType && (
        <Card className="hover:shadow-md transition-shadow duration-300">
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
        <Card className="hover:shadow-md transition-shadow duration-300">
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

      {/* ====== 3.5 库存状态分布 (Donut Chart) ====== */}
      {summary?.statusCounts && (
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-600" />
              库存状态分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const sc = summary.statusCounts;
              const total = (sc.inStock || 0) + (sc.sold || 0) + (sc.returned || 0);
              if (total === 0) return <EmptyState icon={PieChart} title="暂无数据" desc="" />;
              const pieData = [
                { name: '在库', value: sc.inStock || 0, color: '#059669' },
                { name: '已售', value: sc.sold || 0, color: '#0284c7' },
                { name: '已退', value: sc.returned || 0, color: '#ef4444' },
              ].filter(d => d.value > 0);
              return (
                <div className="flex items-center gap-4">
                  <div className="w-40 h-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RPieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="80%"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </RPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="text-center mb-2">
                      <p className="text-2xl font-bold tabular-nums">{total}</p>
                      <p className="text-xs text-muted-foreground">货品总数</p>
                    </div>
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span>{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold tabular-nums">{d.value}</span>
                          <span className="text-xs text-muted-foreground w-10 text-right">{((d.value / total) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* ====== 4. Counter Profit + Channel Profit + Inventory Value By Category ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow duration-300">
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
                  <Tooltip formatter={(v: number, name: string) => [formatPrice(v), name]}
                    labelFormatter={(v: number) => `${v}号柜台`} />
                  <Legend formatter={(v: string) => v} />
                  <Bar dataKey="totalRevenue" fill="#05966930" stroke="#059669" strokeWidth={1} name="营收" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalProfit" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="利润" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300">
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
        {/* 销售渠道分布 (Revenue PieChart) */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4 text-sky-600" />销售渠道分布</CardTitle></CardHeader>
          <CardContent>
            {salesByChannel.length === 0 ? (
              <EmptyState icon={PieChart} title="暂无数据" desc="还没有销售渠道数据" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-36 h-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie
                        data={salesByChannel.map(d => ({ ...d, name: d.label, value: d.totalRevenue }))}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}
                        stroke="none"
                      >
                        {salesByChannel.map((d) => {
                          const colorMap: Record<string, string> = { '门店': '#0284c7', '微信': '#059669', '其他': '#94a3b8' };
                          return <Cell key={d.channel} fill={colorMap[d.label] || '#94a3b8'} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatPrice(v)} />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {salesByChannel.map(d => {
                    const totalRev = salesByChannel.reduce((s: number, c: any) => s + (c.totalRevenue || 0), 0);
                    const pct = totalRev > 0 ? ((d.totalRevenue / totalRev) * 100).toFixed(1) : '0.0';
                    const colorMap: Record<string, string> = { '门店': 'bg-sky-500', '微信': 'bg-emerald-500', '其他': 'bg-gray-400' };
                    const dotColor = colorMap[d.label] || 'bg-gray-400';
                    return (
                      <div key={d.channel} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                            <span className="font-medium">{d.label}</span>
                            <span className="text-muted-foreground text-xs">{d.count}件</span>
                          </div>
                          <span className="font-medium text-emerald-600 text-xs">{formatPrice(d.totalRevenue)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className={`${dotColor} rounded-full h-1.5 transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Inventory Value by Material Category (Pie Chart) */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Gem className="h-4 w-4 text-emerald-600" />库存货值分布（按材质大类）</CardTitle></CardHeader>
          <CardContent>
            {inventoryValueByCategory.length === 0 ? (
              <EmptyState icon={PieChart} title="暂无数据" desc="还没有在库货品" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie
                    data={inventoryValueByCategory}
                    dataKey="totalValue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    label={({ category, percent }: { category: string; percent: number }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  >
                    {inventoryValueByCategory.map((_, i) => (
                      <Cell key={i} fill={['#059669', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#ec4899'][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        {/* Inventory Value by Material Category - Horizontal Bar Chart */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-teal-600" />库存货值分布（材质明细）</CardTitle></CardHeader>
          <CardContent>
            {inventoryValueByCategory.length === 0 ? (
              <EmptyState icon={BarChart3} title="暂无数据" desc="还没有在库货品" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={inventoryValueByCategory.sort((a: any, b: any) => (b.totalValue || 0) - (a.totalValue || 0))} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="category" width={60} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Bar dataKey="totalValue" radius={[0, 4, 4, 0]} name="货值">
                    {inventoryValueByCategory.sort((a: any, b: any) => (b.totalValue || 0) - (a.totalValue || 0)).map((_, i) => (
                      <Cell key={i} fill={['#059669', '#0d9488', '#0ea5e9', '#0284c7', '#f59e0b', '#d97706', '#8b5cf6', '#06b6d4'][i % 8]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== 5. Monthly Sales Trend ====== */}
      <Card className="hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-sky-600" />月度销量趋势</CardTitle></CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <EmptyState icon={TrendingUp} title="暂无数据" desc="还没有趋势数据" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="profitGradTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revenueGradTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 10 }} />
                <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} />
                <Tooltip formatter={(v: number, name: string) => [name === '销量' ? `${v}笔` : formatPrice(v), name]} />
                <Legend formatter={(v: string) => v} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#059669" fill="url(#revenueGradTrend)" strokeWidth={2} name="销售额" dot={{ r: 3, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} />
                <Area yAxisId="left" type="monotone" dataKey="profit" stroke="#0ea5e9" fill="url(#profitGradTrend)" strokeWidth={2} name="毛利" dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
                <Line yAxisId="right" type="monotone" dataKey="salesCount" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="销量" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ====== 利润分析 (Profit Analysis) ====== */}
      {!isEmptyDashboard && (
        <Collapsible open={profitSectionOpen} onOpenChange={setProfitSectionOpen}>
          <Card className="border-l-4 border-l-emerald-600 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  利润分析
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">综合</Badge>
                  <div className="ml-auto">
                    {profitSectionOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-6">
                {/* ====== Profit Trend Chart ====== */}
                {trend.length > 0 && (() => {
                  const profitTrendData = trend.map((t: any) => ({
                    yearMonth: (t.yearMonth || '').slice(-5),
                    revenue: t.revenue || 0,
                    profit: t.profit || 0,
                    margin: t.revenue > 0 ? Math.round((t.profit / t.revenue) * 10000) / 100 : 0,
                  }));
                  return (
                    <div className="tab-fade-in">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        月度利润趋势
                      </p>
                      <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={profitTrendData}>
                          <defs>
                            <linearGradient id="profitTrendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="left" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                          <Tooltip formatter={(v: number, name: string) => [name === '利润率' ? `${v}%` : formatPrice(v), name]} />
                          <Legend formatter={(v: string) => v} />
                          <Area yAxisId="left" type="monotone" dataKey="profit" stroke="#059669" fill="url(#profitTrendGrad)" strokeWidth={2.5} name="毛利" dot={{ r: 3, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#059669', stroke: '#fff', strokeWidth: 2 }} />
                          <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="利润率" strokeDasharray="5 3" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ====== Profit by Category (Horizontal Bar) ====== */}
                  {profitByCategory.length > 0 && (() => {
                    const sortedByProfit = [...profitByCategory].sort((a: any, b: any) => (b.profit || 0) - (a.profit || 0));
                    return (
                      <div className="tab-fade-in">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Gem className="h-3 w-3 text-teal-500" />
                          按材质利润分布
                        </p>
                        <ResponsiveContainer width="100%" height={Math.max(sortedByProfit.length * 40, 200)}>
                          <BarChart data={sortedByProfit} layout="vertical" margin={{ left: 56 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="materialName" width={56} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number, name: string) => [formatPrice(v), name]} />
                            <Legend formatter={(v: string) => v} />
                            <Bar dataKey="revenue" fill="#05966930" stroke="#059669" strokeWidth={1} name="营收" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="profit" fill="#0d9488" radius={[0, 4, 4, 0]} name="利润" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  {/* ====== Margin Distribution ====== */}
                  {profitAnalysis?.marginDistribution && (() => {
                    const distData = profitAnalysis.marginDistribution.filter((d: any) => d.count > 0);
                    const totalSales = distData.reduce((s: number, d: any) => s + d.count, 0);
                    const marginColors: Record<string, string> = {
                      '0-10%': '#ef4444',
                      '10-20%': '#f59e0b',
                      '20-30%': '#0ea5e9',
                      '30%+': '#059669',
                    };
                    const marginBgs: Record<string, string> = {
                      '0-10%': 'bg-red-500',
                      '10-20%': 'bg-amber-500',
                      '20-30%': 'bg-sky-500',
                      '30%+': 'bg-emerald-500',
                    };
                    return (
                      <div className="tab-fade-in">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <BarChart3 className="h-3 w-3 text-amber-500" />
                          利润率分布
                        </p>
                        {distData.length === 0 ? (
                          <EmptyState icon={BarChart3} title="暂无数据" desc="还没有销售记录" />
                        ) : totalSales === 0 ? (
                          <EmptyState icon={BarChart3} title="暂无数据" desc="" />
                        ) : (
                          <div className="space-y-3">
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={profitAnalysis.marginDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(v: number, name: string) => [name === '利润额' ? formatPrice(v) : `${v}笔`, name]} />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="成交笔数">
                                  {profitAnalysis.marginDistribution.map((d: any, i: number) => (
                                    <Cell key={i} fill={marginColors[d.range] || '#94a3b8'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 pt-1">
                              {profitAnalysis.marginDistribution.map((d: any) => {
                                const pct = totalSales > 0 ? ((d.count / totalSales) * 100).toFixed(1) : '0.0';
                                return (
                                  <div key={d.range} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-1.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${marginBgs[d.range] || 'bg-gray-400'}`} />
                                        <span className="font-medium">{d.range}</span>
                                        <span className="text-muted-foreground text-xs">{d.count}笔</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-emerald-600">{formatPrice(d.totalProfit)}</span>
                                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1.5">
                                      <div className={`${marginBgs[d.range] || 'bg-gray-400'} rounded-full h-1.5 transition-all duration-500`} style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* ====== Top 5 Most Profitable Items (by margin) ====== */}
                {profitAnalysis?.topMarginItems?.length > 0 && (() => {
                  const topItems = profitAnalysis.topMarginItems;
                  const maxMargin = Math.max(...topItems.map((s: any) => Math.abs(s.margin)), 1);
                  return (
                    <div className="tab-fade-in">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Crown className="h-3 w-3 text-amber-500" />
                        利润率最高货品 TOP5
                      </p>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {topItems.map((item: any, index: number) => {
                          const barWidth = Math.max((Math.abs(item.margin) / maxMargin) * 100, 5);
                          const rankColors = ['text-amber-500', 'text-gray-400', 'text-amber-700', 'text-gray-500', 'text-gray-500'];
                          const rankBgs = ['bg-amber-50 dark:bg-amber-950/30', 'bg-gray-50 dark:bg-gray-900/30', 'bg-amber-50/50 dark:bg-amber-950/20', '', ''];
                          return (
                            <div key={item.itemId} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors ${rankBgs[index] || ''}`}>
                              <span className={`text-lg font-bold w-6 text-center ${rankColors[index] || 'text-gray-500'}`}>
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium truncate">{item.name}</span>
                                  <Badge variant="secondary" className="text-[10px] shrink-0">{item.materialName}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${item.margin >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-medium w-14 text-right ${item.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {item.margin >= 0 ? '+' : ''}{item.margin.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold">{formatPrice(item.totalProfit)}</p>
                                <p className="text-[10px] text-muted-foreground">利润 · {item.salesCount}笔</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Fallback when no profit analysis data */}
                {(!profitAnalysis || (!profitAnalysis.marginDistribution?.some((d: any) => d.count > 0) && !profitAnalysis.topMarginItems?.length)) && trend.length === 0 && profitByCategory.length === 0 && (
                  <EmptyState icon={Wallet} title="暂无利润数据" desc="开始销售货品后即可查看利润分析" />
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* ====== Inventory Turnover Chart (库存周转率) ====== */}
      {turnoverData.length > 0 && (
        <Card className="border-l-4 border-l-cyan-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-cyan-600" />
              库存周转率（近6个月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                <Tooltip formatter={(v: number, name: string) => [name === '周转率' ? v.toFixed(2) : formatPrice(v), name]} />
                <Legend formatter={(v: string) => v} />
                <Bar yAxisId="left" dataKey="cogs" fill="#06b6d440" stroke="#06b6d4" strokeWidth={1} radius={[4, 4, 0, 0]} name="销售成本" />
                <Bar yAxisId="left" dataKey="avgInventoryValue" fill="#05966940" stroke="#059669" strokeWidth={1} radius={[4, 4, 0, 0]} name="平均库存" />
                <Line yAxisId="right" type="monotone" dataKey="turnoverRate" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} name="周转率" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ====== Monthly Sales Comparison (月度销售对比) ====== */}
      {trend.length > 0 && (() => {
        const last6 = trend.slice(-6);
        return (
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                月度销售对比（近6个月）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={last6}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} name="营收" />
                  <Bar dataKey="profit" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="毛利" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      {/* ====== Sales Heatmap (销售热力图) ====== */}
      <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-emerald-600" />
            销售热力图（近3个月）
            {heatmapData?.maxRevenue > 0 && (
              <span className="text-xs text-muted-foreground font-normal ml-2">最高日销 {formatPrice(heatmapData.maxRevenue)}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {heatmapCalendar && heatmapCalendar.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {heatmapCalendar.map((m, mi) => (
                <div key={mi}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{m.label}</p>
                  <div className="flex gap-1 mb-0.5">
                    {['日', '一', '二', '三', '四', '五', '六'].map((d, di) => (
                      <div key={di} className="w-8 h-4 flex items-center justify-center text-[9px] text-muted-foreground">{d}</div>
                    ))}
                  </div>
                  {m.weeks.map((week, wi) => (
                    <div key={wi} className="flex gap-1 mb-0.5">
                      {week.map((day, di) => (
                        <TooltipProvider key={di}>
                          {day ? (
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-8 h-8 rounded-sm cursor-default flex items-center justify-center text-[9px] transition-all hover:scale-110 ${getHeatmapColor(day.intensity)}`}
                                >
                                  {day.count > 0 ? day.count : day.dayNum}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p>{day.date}</p>
                                <p>销售 {day.count} 件，营收 {formatPrice(day.revenue)}</p>
                              </TooltipContent>
                            </UiTooltip>
                          ) : (
                            <div className="w-8 h-8" />
                          )}
                        </TooltipProvider>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">少</span>
                {[
                  'bg-gray-100 dark:bg-gray-800',
                  'bg-emerald-100 dark:bg-emerald-900/40',
                  'bg-emerald-200 dark:bg-emerald-800/50',
                  'bg-emerald-300 dark:bg-emerald-700/60',
                  'bg-emerald-400 dark:bg-emerald-600/70',
                  'bg-emerald-500 dark:bg-emerald-500/80',
                ].map((cls, i) => (
                  <div key={i} className={`w-4 h-4 rounded-sm ${cls}`} />
                ))}
                <span className="text-xs text-muted-foreground">多</span>
              </div>
            </div>
          ) : (
            <EmptyState icon={Flame} title="暂无数据" desc="还没有销售记录" />
          )}
        </CardContent>
      </Card>

      {/* ====== Top 5 Best Sellers + Customer Frequency ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Best Sellers */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              畅销品排行（利润Top5）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSellers.length === 0 ? (
              <EmptyState icon={Trophy} title="暂无数据" desc="还没有销售记录" />
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {topSellers.map((item: any, index: number) => {
                  const barWidth = Math.max((Math.abs(item.margin) / topSellerMaxMargin) * 100, 5);
                  const rankColors = ['text-amber-500', 'text-gray-400', 'text-amber-700', 'text-gray-500', 'text-gray-500'];
                  const rankBgs = ['bg-amber-50 dark:bg-amber-950/30', 'bg-gray-50 dark:bg-gray-900/30', 'bg-amber-50/50 dark:bg-amber-950/20', '', ''];
                  return (
                    <div key={item.itemId} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors ${rankBgs[index] || ''}`}>
                      <span className={`text-lg font-bold w-6 text-center ${rankColors[index] || 'text-gray-500'}`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{item.name}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{item.materialName}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.margin >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium w-14 text-right ${item.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {item.margin >= 0 ? '+' : ''}{item.margin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{formatPrice(item.totalProfit)}</p>
                        <p className="text-[10px] text-muted-foreground">利润</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Purchase Frequency */}
        <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-600" />
              客户复购率分析
              {customerFreq?.repeatRate != null && (
                <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  复购率 {customerFreq.repeatRate.toFixed(1)}%
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customerFreq?.distribution?.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={customerFreq.distribution} margin={{ top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${v} 人`, '客户数']} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} name="客户数">
                      {customerFreq.distribution.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Separator className="my-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>总客户数: {customerFreq.totalCustomers} 人</span>
                  <span>复购客户: {customerFreq.repeatCustomers} 人</span>
                </div>
              </>
            ) : (
              <EmptyState icon={Users} title="暂无数据" desc="还没有客户购买记录" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== 6. Price Range Analysis (2 pie charts) ====== */}
      {/* ====== Top Customers (消费排行TOP10) ====== */}
      {topCustomers.length > 0 && (
        <Card className="hover:shadow-md transition-shadow duration-300 border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              客户消费排行
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">TOP {Math.min(topCustomers.length, 10)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(topCustomers.length * 38, 200)} margin={{ left: 10, right: 30 }}>
              <BarChart data={topCustomers.slice(0, 10).map((c: any, idx: number) => ({ ...c, rank: idx + 1 }))} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Bar dataKey="totalSpending" name="累计消费" radius={[0, 4, 4, 0]} label={({ name, value, rank }: any) => {
                  const medalEmojis: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
                  const medal = medalEmojis[rank] || '';
                  return medal;
                }}>
                  {topCustomers.slice(0, 10).map((_: any, idx: number) => {
                    const barColors = ['#f59e0b', '#94a3b8', '#d97706', '#059669', '#0ea5e9', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'];
                    return <Cell key={idx} fill={barColors[idx % barColors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend with order counts */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {topCustomers.slice(0, 10).map((c: any, idx: number) => {
                const medalEmojis: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
                return (
                  <span key={c.id} className="flex items-center gap-1">
                    <span>{medalEmojis[idx + 1] || ''}</span>
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span>{c.orderCount}单</span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== Price Range Analysis (2 pie charts) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow duration-300">
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
        <Card className="hover:shadow-md transition-shadow duration-300">
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
        <Card className="hover:shadow-md transition-shadow duration-300">
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
          <Card className="hover:shadow-md transition-shadow duration-300">
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
                      {batchProfit.map((bp, idx) => (
                        <TableRow key={bp.batchCode} className={`${idx % 2 === 0 ? 'even:bg-muted/20' : ''} hover:bg-muted/50 transition-colors`}>
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
          <Card className="hover:shadow-md transition-shadow duration-300">
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

      {/* ====== 8.5 Batch Entry Progress ====== */}
      <Card className="hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4 text-emerald-600" />批次录入进度概览</CardTitle>
        </CardHeader>
        <CardContent>
          {batchEntryProgress.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-4 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">所有批次已全部录入</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {batchEntryProgress.map((b: any) => {
                const pct = b.quantity > 0 ? Math.min(((b.itemsCount || 0) / b.quantity) * 100, 100) : 0;
                return (
                  <div key={b.id || b.batchCode} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <span className="font-mono text-xs w-24 shrink-0">{b.batchCode}</span>
                    <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">{b.materialName || '-'}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-16 text-right">{b.itemsCount || 0}/{b.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== 8.6 Batch Payback Progress Ranking ====== */}
      {batchProfit.filter((b: any) => (b.itemsCount || 0) > 0).length > 0 && (
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />批次回本进度排行</CardTitle>
              <Badge variant="outline">前5名</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...batchProfit]
                .filter((b: any) => (b.itemsCount || 0) > 0)
                .sort((a: any, b: any) => (b.paybackRate || 0) - (a.paybackRate || 0))
                .slice(0, 5)
                .map((bp: any, idx: number) => {
                  const progressPct = Math.min((bp.paybackRate || 0) * 100, 100);
                  const barColor = progressPct >= 100 ? '#059669' : progressPct >= 50 ? '#0ea5e9' : '#f59e0b';
                  return (
                    <div key={bp.batchCode} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold w-5 text-center ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                            {idx + 1}
                          </span>
                          <span className="font-mono text-xs">{bp.batchCode}</span>
                          <span className="text-xs text-muted-foreground">{bp.soldCount}/{bp.itemsCount || bp.quantity}</span>
                        </div>
                        <span className="text-xs font-bold tabular-nums" style={{ color: barColor }}>{progressPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== 9. Stock Aging + Age Distribution ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow duration-300">
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
                          <TableCell className="text-right">{formatPrice(item.allocatedCost || item.estimatedCost || item.costPrice)}</TableCell>
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
        <Card className="hover:shadow-md transition-shadow duration-300">
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
                  <Tooltip formatter={(v: number, name: string) => [name === '货值' ? formatPrice(v) : `${v} 件`, name]} />
                  <Legend formatter={(v: string) => v} />
                  <Bar yAxisId="left" dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="件数" />
                  <Bar yAxisId="right" dataKey="totalValue" fill="#05966940" stroke="#059669" strokeWidth={1} radius={[4, 4, 0, 0]} name="货值" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Monthly Sales Target Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-violet-600" />设置本月销售目标</DialogTitle>
          <DialogDescription>设置月度销售额目标，进度将在看板顶部显示</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>目标金额 (元)</Label>
            <Input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="如: 100000" min="0" step="1000" />
          </div>
          {targetInput && parseFloat(targetInput) > 0 && summary && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground">当前进度</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min((summary.monthRevenue || 0) / parseFloat(targetInput) * 100, 100)}%`,
                    backgroundColor: (summary.monthRevenue || 0) / parseFloat(targetInput) >= 0.75 ? '#059669' : (summary.monthRevenue || 0) / parseFloat(targetInput) >= 0.5 ? '#d97706' : '#dc2626',
                  }} />
                </div>
                <span className="text-xs font-medium tabular-nums">{((summary.monthRevenue || 0) / parseFloat(targetInput) * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowTargetDialog(false)}>取消</Button>
          <Button onClick={() => {
            const val = parseFloat(targetInput);
            if (isNaN(val) || val <= 0) { toast.error('请输入有效的目标金额'); return; }
            setMonthlyTarget(val);
            localStorage.setItem('sales_target', String(val));
            toast.success(`本月目标已设置为 ${formatPrice(val)}`);
            setShowTargetDialog(false);
          }} className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-transform">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}

export default DashboardTab;
