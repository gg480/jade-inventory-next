'use client';

import React from 'react';
import { TabId } from '@/lib/store';
import ThemeToggle from './theme-toggle';

import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Package, ShoppingCart, Layers, Users, Settings,
  BarChart3, Gem, ScrollText,
} from 'lucide-react';

// ========== Mobile Bottom Navigation ==========
function MobileNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: '看板', icon: BarChart3 },
    { id: 'inventory', label: '库存', icon: Package },
    { id: 'sales', label: '销售', icon: ShoppingCart },
    { id: 'batches', label: '批次', icon: Layers },
    { id: 'customers', label: '客户', icon: Users },
    { id: 'logs', label: '日志', icon: ScrollText },
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
    { id: 'logs', label: '操作日志', icon: ScrollText },
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

export { MobileNav, DesktopNav };
