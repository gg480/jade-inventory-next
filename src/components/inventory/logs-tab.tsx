'use client';

import React, { useState, useEffect } from 'react';
import { logsApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, EmptyState, LoadingSkeleton } from './shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import {
  ScrollText, Plus, Pencil, Trash2, ShoppingCart, RotateCcw, Layers,
  RefreshCw, ChevronLeft, ChevronRight, Search,
} from 'lucide-react';

// ========== Action config ==========
const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  create_item: { label: '入库', icon: Plus, color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
  edit_item: { label: '编辑', icon: Pencil, color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40' },
  delete_item: { label: '删除', icon: Trash2, color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/40' },
  sell_item: { label: '销售', icon: ShoppingCart, color: 'text-sky-700 dark:text-sky-300', bgColor: 'bg-sky-100 dark:bg-sky-900/40' },
  return_sale: { label: '退货', icon: RotateCcw, color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  allocate_batch: { label: '分摊', icon: Layers, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-800/40' },
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  item: '货品',
  sale: '销售',
  batch: '批次',
  customer: '客户',
  supplier: '供应商',
};

// ========== Logs Tab ==========
function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expanded detail
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = { page, size: 20 };
      if (actionFilter) params.action = actionFilter;
      if (targetTypeFilter) params.target_type = targetTypeFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await logsApi.getLogs(params);
      setLogs(data?.items || []);
      setPagination(data?.pagination || { total: 0, page: 1, size: 20, pages: 0 });
    } catch {
      toast.error('加载操作日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(1); }, []);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDetail = (detail: string | null) => {
    if (!detail) return null;
    try {
      const obj = JSON.parse(detail);
      return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' → ');
    } catch {
      return detail;
    }
  };

  if (loading && logs.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Header + Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold">操作日志</h2>
          <Badge variant="outline" className="text-xs">共 {pagination.total} 条</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => fetchLogs(pagination.page)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />刷新
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">操作:</span>
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="h-8 text-sm border rounded-md px-2 bg-background"
              >
                <option value="">全部</option>
                {Object.entries(ACTION_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">对象:</span>
              <select
                value={targetTypeFilter}
                onChange={e => setTargetTypeFilter(e.target.value)}
                className="h-8 text-sm border rounded-md px-2 bg-background"
              >
                <option value="">全部</option>
                {Object.entries(TARGET_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-32 h-8 text-xs" placeholder="开始日期" />
            <span className="text-xs text-muted-foreground">至</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-32 h-8 text-xs" placeholder="结束日期" />
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
              onClick={() => fetchLogs(1)}>
              <Search className="h-3 w-3 mr-1" />查询
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ACTION_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button key={key}
              onClick={() => { setActionFilter(key === actionFilter ? '' : key); fetchLogs(1); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                actionFilter === key
                  ? `${cfg.bgColor} ${cfg.color} border-current/20`
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              }`}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <EmptyState icon={ScrollText} title="暂无操作日志" desc="系统会自动记录入库、销售、编辑等操作" />
            ) : (
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-36">时间</TableHead>
                      <TableHead className="w-24">操作</TableHead>
                      <TableHead className="w-20">对象</TableHead>
                      <TableHead className="w-16 text-right">ID</TableHead>
                      <TableHead>详情</TableHead>
                      <TableHead className="w-20">操作人</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const cfg = ACTION_CONFIG[log.action] || { label: log.action, icon: ScrollText, color: 'text-gray-600', bgColor: 'bg-gray-100' };
                      const Icon = cfg.icon;
                      const detail = formatDetail(log.detail);
                      const isExpanded = expandedId === log.id;

                      return (
                        <TableRow key={log.id}
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        >
                          <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                            {formatTime(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.color}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{TARGET_TYPE_LABELS[log.targetType] || log.targetType}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{log.targetId || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs">
                            {detail ? (
                              isExpanded ? (
                                <span className="whitespace-normal">{detail}</span>
                              ) : (
                                <span className="truncate block">{detail}</span>
                              )
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs">{log.operator || 'admin'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="暂无操作日志" desc="系统会自动记录入库、销售、编辑等操作" />
        ) : (
          logs.map((log) => {
            const cfg = ACTION_CONFIG[log.action] || { label: log.action, icon: ScrollText, color: 'text-gray-600', bgColor: 'bg-gray-100' };
            const Icon = cfg.icon;
            const detail = formatDetail(log.detail);

            return (
              <Card key={log.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.color}`}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(log.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{TARGET_TYPE_LABELS[log.targetType] || log.targetType}</span>
                    {log.targetId && <span className="font-mono">#{log.targetId}</span>}
                    <span className="ml-auto">{log.operator || 'admin'}</span>
                  </div>
                  {detail && (
                    <p className="mt-1.5 text-xs text-muted-foreground truncate">{detail}</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={pagination.page <= 1}
            onClick={() => fetchLogs(pagination.page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.pages}
          </span>
          <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages}
            onClick={() => fetchLogs(pagination.page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default LogsTab;
