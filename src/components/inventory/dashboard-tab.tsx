'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge, PaybackBar, EmptyState, LoadingSkeleton, CHART_COLORS } from './shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  Package, ShoppingCart, TrendingUp, DollarSign,
  BarChart3, PieChart, AlertTriangle, CheckCircle, Gem, Layers, Tag, RefreshCw,
} from 'lucide-react';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Line, Area, AreaChart
} from 'recharts';

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

export default DashboardTab;
