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
import { MobileNav, DesktopNav } from '@/components/inventory/navigation';
import { Gem, Package, ShoppingCart, Zap } from 'lucide-react';
import { itemsApi, salesApi } from '@/lib/api';

// Ensure fade-in keyframes are injected
void fadeInStyle;

// ========== Quick Stats Footer ==========
function QuickStatsBar() {
  const [inventoryValue, setInventoryValue] = useState<number | null>(null);
  const [todaySales, setTodaySales] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [itemsData, salesData] = await Promise.all([
          itemsApi.getItems({ page: 1, size: 1, status: 'in_stock' }),
          salesApi.getSales({ page: 1, size: 1000, start_date: today, end_date: today }),
        ]);
        // Get total in_stock count
        const totalInStock = itemsData.pagination?.total || 0;
        // For total value, we need to do a separate query
        // Using pagination total for inventory count
        setInventoryValue(totalInStock);
        const sales = salesData.items || [];
        setTodaySales(sales.length);
        setTodayRevenue(sales.reduce((sum: number, s: any) => sum + (s.actualPrice || 0), 0));
      } catch {
        // Silently fail
      }
    }
    loadStats();
  }, []);

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm">
        <Package className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-muted-foreground">在库:</span>
        <span className="font-semibold">{inventoryValue ?? '...'}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5 text-sm">
        <ShoppingCart className="h-3.5 w-3.5 text-sky-600" />
        <span className="text-muted-foreground">今日销售:</span>
        <span className="font-semibold">{todaySales} 件</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5 text-sm">
        <Zap className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-muted-foreground">今日营收:</span>
        <span className="font-semibold text-emerald-600">¥{todayRevenue.toFixed(2)}</span>
      </div>
    </div>
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
      <footer className="mt-auto hidden md:block border-t border-border bg-card py-3">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><Gem className="h-4 w-4 text-emerald-600" />玉器进销存管理系统</span>
            <div className="w-px h-4 bg-border" />
            <QuickStatsBar />
          </div>
          <span className="text-muted-foreground">Powered by Z.ai</span>
        </div>
      </footer>
    </div>
  );
}
