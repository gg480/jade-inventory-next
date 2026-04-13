'use client';

import { DesktopNav } from './desktop-nav';
import { MobileNav } from './mobile-nav';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DesktopNav />
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        <ScrollArea className="h-[calc(100vh)]">
          <div className="p-4 md:p-6">{children}</div>
        </ScrollArea>
      </main>
      <MobileNav />
    </div>
  );
}
