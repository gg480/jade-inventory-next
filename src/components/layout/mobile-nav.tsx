'use client';

import { useAppStore, type TabId } from '@/lib/store';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Layers,
  Users,
  Settings,
  ScanLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: '看板', icon: LayoutDashboard },
  { id: 'inventory', label: '库存', icon: Package },
  { id: 'sales', label: '销售', icon: ShoppingCart },
  { id: 'batches', label: '批次', icon: Layers },
  { id: 'customers', label: '客户', icon: Users },
  { id: 'settings', label: '设置', icon: Settings },
];

export function MobileNav() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden pb-safe">
      <div className="flex items-end justify-around px-1 pt-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          // Center scan button placeholder
          if (idx === 3) {
            return (
              <div key={item.id} className="flex flex-col items-center">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors',
                    isActive
                      ? 'text-emerald-600'
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.label}</span>
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors',
                isActive ? 'text-emerald-600' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
