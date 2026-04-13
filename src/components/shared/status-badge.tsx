'use client';

import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  in_stock: { label: '在库', variant: 'default' },
  sold: { label: '已售', variant: 'secondary' },
  returned: { label: '已退货', variant: 'destructive' },
  pending: { label: '待分摊', variant: 'outline' },
  allocated: { label: '已分摊', variant: 'default' },
  completed: { label: '已完成', variant: 'default' },
  partial: { label: '部分售出', variant: 'outline' },
  active: { label: '启用', variant: 'default' },
  inactive: { label: '停用', variant: 'secondary' },
};

const channelConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  store: { label: '门店', variant: 'default' },
  wechat: { label: '微信', variant: 'secondary' },
  online: { label: '线上', variant: 'outline' },
};

interface StatusBadgeProps {
  status: string;
  type?: 'status' | 'channel';
}

export function StatusBadge({ status, type = 'status' }: StatusBadgeProps) {
  const config = type === 'channel' ? channelConfig[status] : statusConfig[status];
  if (!config) return <Badge variant="outline">{status}</Badge>;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
