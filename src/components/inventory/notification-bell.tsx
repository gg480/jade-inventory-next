'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { itemsApi, batchesApi, dashboardApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Bell, AlertTriangle, Package, TrendingDown, Clock, ShoppingCart,
  CheckCircle2, X,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'overdue' | 'batch_incomplete' | 'low_margin' | 'today_summary';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  timestamp?: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    const notifs: Notification[] = [];

    try {
      // 1. Overdue inventory
      const itemsData = await itemsApi.getItems({ page: 1, size: 1, status: 'in_stock', sort_by: 'purchase_date', sort_order: 'asc' });
      const overdueCount = itemsData.pagination?.total || 0;
      // We need the actual count of items over 90 days - check the dashboard
      const summary = await dashboardApi.getSummary();
      const agingData = await dashboardApi.getStockAging();

      if (agingData?.overdue && agingData.overdue > 0) {
        notifs.push({
          id: 'overdue',
          type: 'overdue',
          title: '压货预警',
          description: `${agingData.overdue} 件货品库存超过90天，建议尽快处理`,
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
        });
      }

      // 2. Batch incomplete
      const batchesData = await batchesApi.getBatches({ page: 1, size: 1000 });
      const incompleteBatches = (batchesData.items || []).filter((b: any) => (b.itemsCount || 0) < (b.quantity || 0));
      if (incompleteBatches.length > 0) {
        notifs.push({
          id: 'batch_incomplete',
          type: 'batch_incomplete',
          title: '批次待录入',
          description: `${incompleteBatches.length} 个批次尚未录满，共 ${incompleteBatches.reduce((s: number, b: any) => s + ((b.quantity || 0) - (b.itemsCount || 0)), 0)} 件待录入`,
          icon: <Package className="h-4 w-4" />,
          color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
        });
      }

      // 3. Low margin items
      const allItems = await itemsApi.getItems({ page: 1, size: 200, status: 'in_stock' });
      const lowMarginItems = (allItems.items || []).filter((i: any) => {
        const cost = i.allocatedCost || i.estimatedCost || i.costPrice || 0;
        const price = i.sellingPrice || 0;
        return cost > 0 && price > 0 && (price - cost) / price < 0.3;
      });
      if (lowMarginItems.length > 0) {
        notifs.push({
          id: 'low_margin',
          type: 'low_margin',
          title: '低毛利预警',
          description: `${lowMarginItems.length} 件在库货品毛利率低于30%，建议调整定价`,
          icon: <TrendingDown className="h-4 w-4" />,
          color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
        });
      }

      // 4. Today's summary
      const today = new Date().toISOString().slice(0, 10);
      const todaySales = await dashboardApi.getSummary({ start_date: today, end_date: today });
      if (todaySales && (todaySales.totalSales > 0 || todaySales.totalRevenue > 0)) {
        notifs.push({
          id: 'today_summary',
          type: 'today_summary',
          title: '今日销售',
          description: `已售 ${todaySales.totalSales || 0} 件，营收 ¥${((todaySales.totalRevenue || 0)).toFixed(0)}`,
          icon: <ShoppingCart className="h-4 w-4" />,
          color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
        });
      }
    } catch {
      // Silently fail - notifications are non-critical
    }

    setNotifications(notifs);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async API fetch, setState in callback is acceptable
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter(n => !dismissed.has(n.id)).length;

  function dismissNotification(id: string) {
    setDismissed(prev => new Set(prev).add(id));
  }

  function dismissAll() {
    setDismissed(new Set(notifications.map(n => n.id)));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0" onClick={() => { setOpen(true); }}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center animate-in zoom-in duration-200">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" /> 通知提醒
          </h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={dismissAll}>
              全部已读
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm">暂无通知</p>
              <p className="text-xs">所有指标正常</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 transition-colors ${dismissed.has(notif.id) ? 'opacity-40' : 'hover:bg-muted/50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 rounded-lg p-1.5 ${notif.color}`}>
                      {notif.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{notif.title}</p>
                        {!dismissed.has(notif.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => dismissNotification(notif.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
