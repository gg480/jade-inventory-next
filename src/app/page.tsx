'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, TabId } from '@/lib/store';
import { fadeInStyle } from '@/components/inventory/shared';
import DashboardTab from '@/components/inventory/dashboard-tab';
import InventoryTab from '@/components/inventory/inventory-tab';
import SalesTab from '@/components/inventory/sales-tab';
import BatchesTab from '@/components/inventory/batches-tab';
import CustomersTab from '@/components/inventory/customers-tab';
import LogsTab from '@/components/inventory/logs-tab';
import SettingsTab from '@/components/inventory/settings-tab';
import { MobileNav, DesktopNav, ShortcutsHelpDialog } from '@/components/inventory/navigation';
import { Gem, Package, ShoppingCart, Zap, Clock } from 'lucide-react';
import { itemsApi, salesApi, batchesApi } from '@/lib/api';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip';

// Ensure fade-in keyframes are injected
void fadeInStyle;

// ========== Quick Stats Footer ==========
function QuickStatsBar() {
  const [inventoryValue, setInventoryValue] = useState<number | null>(null);
  const [todaySales, setTodaySales] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [pendingBatches, setPendingBatches] = useState(0);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [itemsData, salesData, batchesData] = await Promise.allSettled([
        itemsApi.getItems({ page: 1, size: 1, status: 'in_stock' }),
        salesApi.getSales({ page: 1, size: 1000, start_date: today, end_date: today }),
        batchesApi.getBatches({ page: 1, size: 100 }),
      ]);
      if (itemsData.status === 'fulfilled') {
        setInventoryValue(itemsData.value.pagination?.total || 0);
      }
      if (salesData.status === 'fulfilled') {
        const sales = salesData.value.items || [];
        setTodaySales(sales.length);
        setTodayRevenue(sales.reduce((sum: number, s: any) => sum + (s.actualPrice || 0), 0));
      }
      if (batchesData.status === 'fulfilled') {
        const batches = batchesData.value.items || [];
        setPendingBatches(batches.filter((b: any) => (b.itemsCount || 0) < (b.quantity || 0)).length);
      }
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadStats, 0);
    const interval = setInterval(loadStats, 30000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-sm cursor-default">
              <Package className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-muted-foreground">在库:</span>
              <span className="font-semibold">{inventoryValue ?? '...'}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>当前在库货品总数</TooltipContent>
        </Tooltip>
        <div className="w-px h-4 bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-sm cursor-default">
              <ShoppingCart className="h-3.5 w-3.5 text-sky-600" />
              <span className="text-muted-foreground">今日销售:</span>
              <span className="font-semibold">{todaySales} 件</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>今日已售出货品数量</TooltipContent>
        </Tooltip>
        <div className="w-px h-4 bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-sm cursor-default">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-muted-foreground">今日营收:</span>
              <span className="font-semibold text-emerald-600">¥{todayRevenue.toFixed(2)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>今日销售总金额</TooltipContent>
        </Tooltip>
        <div className="w-px h-4 bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-sm cursor-default">
              <Clock className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-muted-foreground">批次待录入:</span>
              <span className={`font-semibold ${pendingBatches > 0 ? 'text-orange-600' : ''}`}>{pendingBatches}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>有 {pendingBatches} 个批次尚未录入完成</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

// ========== Mobile Quick Stats (fixed bottom bar) ==========
function MobileQuickStats() {
  const [inventoryValue, setInventoryValue] = useState<number | null>(null);
  const [todaySales, setTodaySales] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [itemsData, salesData] = await Promise.allSettled([
        itemsApi.getItems({ page: 1, size: 1, status: 'in_stock' }),
        salesApi.getSales({ page: 1, size: 1000, start_date: today, end_date: today }),
      ]);
      if (itemsData.status === 'fulfilled') {
        setInventoryValue(itemsData.value.pagination?.total || 0);
      }
      if (salesData.status === 'fulfilled') {
        const sales = salesData.value.items || [];
        setTodaySales(sales.length);
        setTodayRevenue(sales.reduce((sum: number, s: any) => sum + (s.actualPrice || 0), 0));
      }
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadStats, 0);
    const interval = setInterval(loadStats, 30000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  return (
    <div className="md:hidden fixed bottom-14 left-0 right-0 z-40 bg-card border-t border-border py-2 px-4">
      <div className="flex items-center justify-around text-xs">
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3 text-emerald-600" />
          <span className="text-muted-foreground">在库</span>
          <span className="font-bold">{inventoryValue ?? '...'}</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1">
          <ShoppingCart className="h-3 w-3 text-sky-600" />
          <span className="text-muted-foreground">今日</span>
          <span className="font-bold">{todaySales}</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-amber-600" />
          <span className="text-muted-foreground">营收</span>
          <span className="font-bold text-emerald-600">¥{todayRevenue.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

// ========== Main Page ==========
export default function JadeInventoryPage() {
  const { activeTab, setActiveTab } = useAppStore();
  const [animKey, setAnimKey] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setAnimKey(k => k + 1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const tabMap: Record<string, TabId> = {
      '1': 'dashboard', '2': 'inventory', '3': 'sales',
      '4': 'batches', '5': 'customers', '6': 'logs', '7': 'settings',
    };

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return;
      }

      // Tab switching with number keys
      if (tabMap[e.key]) {
        e.preventDefault();
        handleTabChange(tabMap[e.key]);
        return;
      }

      // Ctrl/Cmd + K: focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setActiveTab('inventory');
        setAnimKey(k => k + 1);
        // Focus search input after a brief delay for tab to render
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="SKU"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }, 100);
        return;
      }

      // ? key: show shortcuts help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'inventory': return <InventoryTab />;
      case 'sales': return <SalesTab />;
      case 'batches': return <BatchesTab />;
      case 'customers': return <CustomersTab />;
      case 'logs': return <LogsTab />;
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
      <MobileQuickStats />
      <footer className="mt-auto hidden md:block border-t border-border bg-card py-3">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><Gem className="h-4 w-4 text-emerald-600" />玉器进销存管理系统</span>
            <div className="w-px h-4 bg-border" />
            <QuickStatsBar />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">按 ? 查看快捷键</span>
            <span className="text-muted-foreground">Powered by Z.ai</span>
          </div>
        </div>
      </footer>
      <ShortcutsHelpDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}
