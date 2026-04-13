'use client';

import { useAppStore, type TabId } from '@/lib/store';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Layers,
  Users,
  Settings,
  Gem,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: '利润看板', icon: LayoutDashboard },
  { id: 'inventory', label: '库存管理', icon: Package },
  { id: 'sales', label: '销售记录', icon: ShoppingCart },
  { id: 'batches', label: '批次管理', icon: Layers },
  { id: 'customers', label: '客户管理', icon: Users },
  { id: 'settings', label: '设置', icon: Settings },
];

export function DesktopNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Gem className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">玉器进销存</h1>
          <p className="text-[11px] text-muted-foreground">Jade Inventory</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4.5 w-4.5', isActive && 'text-emerald-600')} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">© 2025 玉器进销存</p>
      </div>
    </aside>
  );
}
