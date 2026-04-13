'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { customersApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, EmptyState, LoadingSkeleton } from './shared';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { Users, Plus, Search, Pencil, ChevronDown, ChevronUp, Crown, Sparkles, TrendingUp, Shield, ShieldCheck } from 'lucide-react';

// VIP level helper
function getVipLevel(totalSpending: number) {
  if (totalSpending >= 50000) return { label: '钻石会员', icon: Sparkles, color: 'bg-gradient-to-r from-violet-100 to-purple-100 text-violet-800 dark:from-violet-900 dark:to-purple-900 dark:text-violet-200 border-violet-300 dark:border-violet-700' };
  if (totalSpending >= 20000) return { label: '金卡会员', icon: Crown, color: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 dark:from-amber-900 dark:to-yellow-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' };
  if (totalSpending >= 5000) return { label: '银卡会员', icon: ShieldCheck, color: 'bg-gradient-to-r from-gray-100 to-slate-200 text-gray-700 dark:from-gray-800 dark:to-slate-800 dark:text-gray-200 border-gray-300 dark:border-gray-600' };
  return { label: '普通客户', icon: Shield, color: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' };
}

// ========== Customers Tab ==========
function CustomersTab() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, size: 20, pages: 0 });
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', phone: '', wechat: '', notes: '' });
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', wechat: '', notes: '' });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await customersApi.getCustomers({ page: pagination.page, size: pagination.size, keyword });
      setCustomers(data.items || []);
      setPagination(data.pagination || { total: 0, page: 1, size: 20, pages: 0 });
      setStats(data.stats || null);
    } catch { toast.error('加载客户失败'); } finally { setLoading(false); }
  }, [pagination.page, keyword]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    if (expandedCustomerId) {
      setDetailLoading(true);
      customersApi.getCustomerDetail(expandedCustomerId).then((data: any) => {
        setCustomerDetail(data);
      }).catch(() => {
        toast.error('加载客户详情失败');
      }).finally(() => setDetailLoading(false));
    } else {
      setCustomerDetail(null);
    }
  }, [expandedCustomerId]);

  async function handleCreate() {
    try {
      await customersApi.createCustomer(createForm);
      toast.success('客户创建成功');
      setShowCreate(false);
      setCreateForm({ name: '', phone: '', wechat: '', notes: '' });
      fetchCustomers();
    } catch (e: any) { toast.error(e.message || '创建失败'); }
  }

  async function handleEditCustomer() {
    if (!editCustomer) return;
    try {
      await customersApi.updateCustomer(editCustomer.id, editForm);
      toast.success('客户更新成功');
      setEditCustomer(null);
      fetchCustomers();
    } catch (e: any) { toast.error(e.message || '更新失败'); }
  }

  function openEditDialog(customer: any) {
    setEditCustomer(customer);
    setEditForm({ name: customer.name || '', phone: customer.phone || '', wechat: customer.wechat || '', notes: customer.notes || '' });
  }

  if (loading && customers.length === 0) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 hover:shadow-md hover:border-emerald-400 transition-all duration-200">
            <CardContent className="p-4">
              <div className="absolute -right-1 -bottom-1 opacity-10"><Users className="h-16 w-16 text-emerald-500" /></div>
              <p className="text-sm text-muted-foreground">客户总数</p>
              <p className="text-2xl font-bold">{stats.totalCustomers}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-l-4 border-l-sky-500 hover:shadow-md hover:border-sky-400 transition-all duration-200">
            <CardContent className="p-4">
              <div className="absolute -right-1 -bottom-1 opacity-10"><TrendingUp className="h-16 w-16 text-sky-500" /></div>
              <p className="text-sm text-muted-foreground">本月新增</p>
              <p className="text-2xl font-bold text-sky-600">{stats.newThisMonth}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-l-4 border-l-amber-500 hover:shadow-md hover:border-amber-400 transition-all duration-200">
            <CardContent className="p-4">
              <div className="absolute -right-1 -bottom-1 opacity-10"><Crown className="h-16 w-16 text-amber-500" /></div>
              <p className="text-sm text-muted-foreground">总消费</p>
              <p className="text-2xl font-bold text-emerald-600">{formatPrice(stats.totalSpending)}</p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-l-4 border-l-purple-500 hover:shadow-md hover:border-purple-400 transition-all duration-200">
            <CardContent className="p-4">
              <div className="absolute -right-1 -bottom-1 opacity-10"><Sparkles className="h-16 w-16 text-purple-500" /></div>
              <p className="text-sm text-muted-foreground">平均客单价</p>
              <p className="text-2xl font-bold">{formatPrice(stats.avgOrderValue)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input placeholder="搜索客户" value={keyword} onChange={e => setKeyword(e.target.value)} className="w-48 h-9" />
          <Button size="sm" onClick={() => { setPagination(p => ({ ...p, page: 1 })); fetchCustomers(); }}><Search className="h-3 w-3" /></Button>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreate(true)}>
          <Plus className="h-3 w-3 mr-1" /> 新增客户
        </Button>
      </div>

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="暂无客户" desc="还没有添加任何客户，点击「新增客户」开始" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map(c => {
            const vip = getVipLevel(c.totalSpending || 0);
            const VipIcon = vip.icon;
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{c.name}</h3>
                      <Badge variant="outline" className="text-xs">{c.customerCode}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600" onClick={() => openEditDialog(c)} title="编辑客户"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpandedCustomerId(expandedCustomerId === c.id ? null : c.id)}>
                        {expandedCustomerId === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* VIP Badge + Total Spending */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={`text-xs ${vip.color}`}>
                      <VipIcon className="h-3 w-3 mr-1" />
                      {vip.label}
                    </Badge>
                    <span className="text-sm font-medium text-emerald-600">{formatPrice(c.totalSpending || 0)}</span>
                    <span className="text-xs text-muted-foreground">({c.orderCount || 0}单)</span>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    {c.phone && <p>📞 {c.phone}</p>}
                    {c.wechat && <p>💬 {c.wechat}</p>}
                    {c.notes && <p className="truncate">📝 {c.notes}</p>}
                  </div>

                  {/* Expanded Detail */}
                  {expandedCustomerId === c.id && (
                    <div className="mt-3 pt-3 border-t border-border">
                      {detailLoading ? (
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /></div>
                      ) : customerDetail ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">总消费</p>
                              <p className="font-bold text-emerald-600">
                                {customerDetail.saleRecords
                                  ? formatPrice(customerDetail.saleRecords.reduce((sum: number, s: any) => sum + (s.actualPrice || 0), 0))
                                  : '¥0.00'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">购买次数</p>
                              <p className="font-bold">{customerDetail.saleRecords?.length || 0} 次</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">最近购买</p>
                              <p className="font-medium">{customerDetail.saleRecords?.length > 0
                                ? customerDetail.saleRecords.sort((a: any, b: any) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())[0]?.saleDate
                                : '无'}</p>
                            </div>
                          </div>
                          {customerDetail.saleRecords && customerDetail.saleRecords.length > 0 && (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                              <p className="text-xs font-medium text-muted-foreground">购买记录</p>
                              {customerDetail.saleRecords.slice(0, 10).map((sr: any) => (
                                <div key={sr.id} className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded hover:bg-muted/80 transition-colors gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono shrink-0">{sr.item?.skuCode || sr.saleNo}</span>
                                    <Badge variant="outline" className="text-[10px] h-4 shrink-0">{sr.channel === 'store' ? '门店' : '微信'}</Badge>
                                    {sr.item?.batchCode && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">{sr.item.batchCode}</Badge>
                                    )}
                                  </div>
                                  <span className="font-medium text-emerald-600 shrink-0">{formatPrice(sr.actualPrice)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">无法加载详情</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>上一页</Button>
          <span className="text-sm text-muted-foreground">{pagination.page} / {pagination.pages}</span>
          <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>下一页</Button>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增客户</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>姓名 *</Label><Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>电话</Label><Input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>微信号</Label><Input value={createForm.wechat} onChange={e => setCreateForm(f => ({ ...f, wechat: e.target.value }))} /></div>
            <div className="space-y-1"><Label>备注</Label><Textarea value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700" disabled={!createForm.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editCustomer !== null} onOpenChange={open => { if (!open) setEditCustomer(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑客户</DialogTitle><DialogDescription>{editCustomer?.customerCode || ''}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>姓名 *</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>电话</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>微信号</Label><Input value={editForm.wechat} onChange={e => setEditForm(f => ({ ...f, wechat: e.target.value }))} /></div>
            <div className="space-y-1"><Label>备注</Label><Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>取消</Button>
            <Button onClick={handleEditCustomer} className="bg-emerald-600 hover:bg-emerald-700" disabled={!editForm.name}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomersTab;
