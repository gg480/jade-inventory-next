'use client';

import { OverviewCards } from './overview-cards';
import { BatchPayback } from './batch-payback';
import { ProfitCharts } from './profit-charts';
import { SalesTrend } from './sales-trend';
import { StockAging } from './stock-aging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAppStore } from '@/lib/store';
import { dashboardApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Download, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion } from 'framer-motion';

export function DashboardPage() {
  const { dashboardFilters, setDashboardFilters } = useAppStore();
  const params: Record<string, string> = {};
  if (dashboardFilters.dateFrom) params.dateFrom = dashboardFilters.dateFrom;
  if (dashboardFilters.dateTo) params.dateTo = dashboardFilters.dateTo;

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', params],
    queryFn: () => dashboardApi.getSummary(params),
  });

  const batchProfitQuery = useQuery({
    queryKey: ['dashboard', 'batch-profit', params],
    queryFn: () => dashboardApi.getBatchProfit(params),
  });

  const categoryQuery = useQuery({
    queryKey: ['dashboard', 'profit-by-category', params],
    queryFn: () => dashboardApi.getProfitByCategory(params),
  });

  const channelQuery = useQuery({
    queryKey: ['dashboard', 'profit-by-channel', params],
    queryFn: () => dashboardApi.getProfitByChannel(params),
  });

  const trendQuery = useQuery({
    queryKey: ['dashboard', 'trend', params],
    queryFn: () => dashboardApi.getTrend(params),
  });

  const agingQuery = useQuery({
    queryKey: ['dashboard', 'stock-aging', params],
    queryFn: () => dashboardApi.getStockAging(params),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">利润看板</h2>
        <div className="flex items-center gap-2">
          {/* Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dashboardFilters.dateFrom && dashboardFilters.dateTo
                  ? `${dashboardFilters.dateFrom} ~ ${dashboardFilters.dateTo}`
                  : '选择日期'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{
                  from: dashboardFilters.dateFrom ? new Date(dashboardFilters.dateFrom) : undefined,
                  to: dashboardFilters.dateTo ? new Date(dashboardFilters.dateTo) : undefined,
                }}
                onSelect={(range) => {
                  setDashboardFilters({
                    dateFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
                    dateTo: range?.to ? format(range.to, 'yyyy-MM-dd') : '',
                  });
                }}
                numberOfMonths={2}
                locale={zhCN}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setDashboardFilters({ dateFrom: '', dateTo: '' });
            }}
          >
            重置
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            导出
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards data={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      {/* Batch Payback */}
      <BatchPayback data={batchProfitQuery.data} isLoading={batchProfitQuery.isLoading} />

      {/* Profit Charts */}
      <ProfitCharts
        categoryData={categoryQuery.data}
        channelData={channelQuery.data}
        isLoading={categoryQuery.isLoading || channelQuery.isLoading}
      />

      {/* Sales Trend */}
      <SalesTrend data={trendQuery.data} isLoading={trendQuery.isLoading} />

      {/* Stock Aging */}
      <StockAging data={agingQuery.data} isLoading={agingQuery.isLoading} />
    </motion.div>
  );
}
