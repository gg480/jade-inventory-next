'use client';

import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4 text-muted-foreground">
        {icon || <PackageOpen className="h-8 w-8" />}
      </div>
      <h3 className="mb-1 text-lg font-medium">{title}</h3>
      {description && <p className="mb-4 text-sm text-muted-foreground max-w-xs">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
