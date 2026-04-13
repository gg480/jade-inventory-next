'use client';

import React, { useState } from 'react';
import { TabId } from '@/lib/store';
import ThemeToggle from './theme-toggle';
import NotificationBell from './notification-bell';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Package, ShoppingCart, Layers, Users, Settings,
  BarChart3, Gem, ScrollText, Keyboard, LogOut,
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

// ========== Keyboard Shortcuts Help Dialog ==========
function ShortcutsHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const shortcuts = [
    { keys: '⌘/Ctrl + K', description: '聚焦搜索栏' },
    { keys: '⌘/Ctrl + N', description: '新增入库' },
    { keys: '1 ~ 7', description: '切换标签页' },
    { keys: 'Esc', description: '关闭弹窗' },
    { keys: '?', description: '显示快捷键帮助' },
  ];

  const tabShortcuts = [
    { key: '1', tab: '利润看板' },
    { key: '2', tab: '库存管理' },
    { key: '3', tab: '销售记录' },
    { key: '4', tab: '批次管理' },
    { key: '5', tab: '客户管理' },
    { key: '6', tab: '操作日志' },
    { key: '7', tab: '系统设置' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" /> 快捷键
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium mb-2">通用快捷键</p>
            <div className="space-y-2">
              {shortcuts.map(s => (
                <div key={s.keys} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.description}</span>
                  <Badge variant="outline" className="font-mono text-xs">{s.keys}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">标签页切换</p>
            <div className="grid grid-cols-2 gap-2">
              {tabShortcuts.map(s => (
                <div key={s.key} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="font-mono text-xs w-6 justify-center">{s.key}</Badge>
                  <span className="text-muted-foreground">{s.tab}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========== Desktop Top Navigation ==========
function DesktopNav({ activeTab, onTabChange, onLogout }: { activeTab: TabId; onTabChange: (t: TabId) => void; onLogout?: () => void }) {
  const [showShortcuts, setShowShortcuts] = useState(false);
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
    <>
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
              <NotificationBell />
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setShowShortcuts(true)} title="快捷键">
                <Keyboard className="h-4 w-4" />
              </Button>
              {onLogout && (
                <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground hover:text-red-600" onClick={onLogout} title="退出登录">
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      <ShortcutsHelpDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </>
  );
}

export { MobileNav, DesktopNav, ShortcutsHelpDialog };
