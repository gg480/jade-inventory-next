'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logsApi } from '@/lib/api';
import { toast } from 'sonner';
import { EmptyState, LoadingSkeleton } from './shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { ScrollText, RefreshCw, Filter, Clock, User, Target, FileText } from 'lucide-react';
import Pagination from './pagination';

// Action type config with labels and colors
const ACTION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  create_item: { label: '入库', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', icon: '📦' },
  edit_item: { label: '编辑', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200', icon: '✏️' },
  delete_item: { label: '删除', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '🗑️' },
  sell_item: { label: '出库', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', icon: '💰' },
  return_sale: { label: '退货', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: '↩️' },
  allocate_batch: { label: '分摊', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: '📊' },
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  item: '货品',
  batch: '批次',
  sale: '销售',
  customer: '客户',
  supplier: '供应商',
};

const ACTION_OPTIONS = [
  { value: '', label: '全部操作' },
  ...Object.entries(ACTION_CONFIG).map(([value, { label }]) => ({ value, label })),
];

function ActionBadge({ action }: { action: string }) {
  const config = ACTION_CONFIG[action];
  if (!config) return <Badge variant="secondary">{action}</Badge>;
  return <Badge variant="secondary" className={config.color}>{config.label}</Badge>;
}

// ========== Logs Tab ==========
function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(async (page = pagination.page) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, size: 20 };
      if (actionFilter) params.action = actionFilter;
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
  }, [pagination.page, actionFilter, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto refresh every 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => fetchLogs(pagination.page), 10000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs, pagination.page]);

  function handleFilter() {
    setPagination(p => ({ ...p, page: 1 }));
    fetchLogs(1);
  }

  function handleReset() {
    setActionFilter('');
    setStartDate('');
    setEndDate('');
    setPagination(p => ({ ...p, page: 1 }));
  }

  function formatTime(dateStr: string) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading && logs.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {/* Filter Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-emerald-600" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">操作类型</span>
              <Select value={actionFilter || '_all'} onValueChange={v => setActionFilter(v === '_all' ? '' : v)}>
                <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value || '_all'} value={opt.value || '_all'}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">开始日期</span>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36 h-9" />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">结束日期</span>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36 h-9" />
            </div>
            <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700" onClick={handleFilter}>
              <RefreshCw className="h-3 w-3 mr-1" />查询
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>重置</Button>
            <div className="flex items-center gap-2 ml-auto">
              <Button
                size="sm"
                variant={autoRefresh ? 'default' : 'outline'}
                className={`h-9 text-xs ${autoRefresh ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Clock className="h-3 w-3 mr-1" />
                {autoRefresh ? '自动刷新中' : '自动刷新'}
              </Button>
              <Button size="sm" variant="outline" className="h-9" onClick={() => fetchLogs(pagination.page)}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <ScrollText className="h-4 w-4" />
        <span>共 {pagination.total} 条操作日志</span>
        {autoRefresh && <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">每10秒刷新</Badge>}
      </div>

      {/* Logs - Desktop Table */}
      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="暂无操作日志" desc="系统操作将自动记录到此处" />
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-44">时间</TableHead>
                      <TableHead className="w-24">操作类型</TableHead>
                      <TableHead className="w-24">对象类型</TableHead>
                      <TableHead className="w-20">对象ID</TableHead>
                      <TableHead>详情</TableHead>
                      <TableHead className="w-24">操作人</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(log.createdAt)}
                        </TableCell>
                        <TableCell><ActionBadge action={log.action} /></TableCell>
                        <TableCell className="text-sm">{TARGET_TYPE_LABELS[log.targetType] || log.targetType || '-'}</TableCell>
                        <TableCell className="text-sm font-mono">{log.targetId || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={log.detail || ''}>
                          {log.detail || '-'}
                        </TableCell>
                        <TableCell className="text-sm">{log.operator || '系统'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {logs.map((log: any) => (
              <Card key={log.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 space-y-2">
                  {/* Top: action badge + time */}
                  <div className="flex items-center justify-between">
                    <ActionBadge action={log.action} />
                    <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                  </div>
                  {/* Target info */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" />{TARGET_TYPE_LABELS[log.targetType] || log.targetType || '-'}</span>
                    <span className="font-mono">#{log.targetId || '-'}</span>
                    {log.operator && <span className="flex items-center gap-1"><User className="h-3 w-3" />{log.operator}</span>}
                  </div>
                  {/* Detail */}
                  {log.detail && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2 line-clamp-2 flex items-start gap-1">
                      <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="truncate">{log.detail}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      <Pagination page={pagination.page} pages={pagination.pages} onPageChange={p => { setPagination(prev => ({ ...prev, page: p })); fetchLogs(p); }} />
    </div>
  );
}

export default LogsTab;
