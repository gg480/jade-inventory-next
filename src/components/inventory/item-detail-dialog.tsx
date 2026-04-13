'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { itemsApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge } from './shared';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { Trash2, Star, Upload, ImageIcon } from 'lucide-react';

// ========== Item Detail Dialog ==========
function ItemDetailDialog({ itemId, open, onOpenChange }: { itemId: number | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const data = await itemsApi.getItem(id);
      setItem(data);
    } catch {
      toast.error('加载货品详情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && itemId) {
      fetchDetail(itemId);
    } else {
      setItem(null);
    }
  }, [open, itemId, fetchDetail]);

  async function handleUploadImage(file: File) {
    if (!itemId) return;
    setUploading(true);
    try {
      await itemsApi.uploadImage(itemId, file);
      toast.success('图片上传成功');
      fetchDetail(itemId);
    } catch (e: any) {
      toast.error(e.message || '上传失败');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(imageId: number) {
    if (!itemId) return;
    try {
      await itemsApi.deleteImage(itemId, imageId);
      toast.success('图片已删除');
      fetchDetail(itemId);
    } catch (e: any) {
      toast.error(e.message || '删除失败');
    }
  }

  async function handleSetCoverImage(imageId: number) {
    if (!itemId) return;
    try {
      await itemsApi.setCoverImage(itemId, imageId);
      toast.success('已设为封面');
      fetchDetail(itemId);
    } catch (e: any) {
      toast.error(e.message || '设置封面失败');
    }
  }

  const specFieldLabels: Record<string, string> = {
    weight: '克重(g)', metalWeight: '金重(g)', size: '尺寸', braceletSize: '圈口',
    beadCount: '颗数', beadDiameter: '珠径', ringSize: '戒圈',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>货品详情</DialogTitle>
          <DialogDescription>{item?.skuCode || ''}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3 py-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-32 w-full" /></div>
        ) : item ? (
          <div className="space-y-4 py-2">
            {/* Images */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">图片</p>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file);
                    e.target.value = '';
                  }} disabled={uploading} />
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={uploading} asChild>
                    <span><Upload className="h-3 w-3 mr-1" />{uploading ? '上传中...' : '上传图片'}</span>
                  </Button>
                </label>
              </div>
              {item.images && item.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {item.images.map((img: any) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border bg-muted">
                      <img src={img.url} alt="货品图片" className="w-full aspect-square object-cover" />
                      {img.isCover && (
                        <div className="absolute top-1 left-1"><Badge className="h-4 text-[10px] bg-emerald-600"><Star className="h-2.5 w-2.5 mr-0.5" />封面</Badge></div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-1 p-1">
                        {!img.isCover && (
                          <Button size="sm" variant="secondary" className="h-5 text-[10px] px-1.5" onClick={() => handleSetCoverImage(img.id)}>设为封面</Button>
                        )}
                        <Button size="sm" variant="destructive" className="h-5 text-[10px] px-1.5" onClick={() => handleDeleteImage(img.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">暂无图片</p>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{item.skuCode}</span></div>
              <div><span className="text-muted-foreground">名称:</span> {item.name || '-'}</div>
              <div><span className="text-muted-foreground">材质:</span> {item.materialName || '-'}</div>
              <div><span className="text-muted-foreground">器型:</span> {item.typeName || '-'}</div>
              <div><span className="text-muted-foreground">状态:</span> <StatusBadge status={item.status} /></div>
              <div><span className="text-muted-foreground">库龄:</span> {item.ageDays != null ? `${item.ageDays}天` : '-'}</div>
            </div>

            <Separator />

            {/* Batch Info */}
            {item.batchCode && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">批次:</span> <span className="font-mono">{item.batchCode}</span></div>
                </div>
                <Separator />
              </>
            )}

            {/* Costs & Prices */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">成本价:</span> <span className="font-medium">{formatPrice(item.costPrice)}</span></div>
              <div><span className="text-muted-foreground">分摊成本:</span> <span className="font-medium">{formatPrice(item.allocatedCost)}</span></div>
              <div><span className="text-muted-foreground">底价:</span> <span className="font-medium">{formatPrice(item.floorPrice)}</span></div>
              <div><span className="text-muted-foreground text-emerald-700">售价:</span> <span className="font-bold text-emerald-600">{formatPrice(item.sellingPrice)}</span></div>
            </div>

            <Separator />

            {/* Other Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">产地:</span> {item.origin || '-'}</div>
              <div><span className="text-muted-foreground">柜台:</span> {item.counter ?? '-'}</div>
              <div><span className="text-muted-foreground">证书号:</span> {item.certNo || '-'}</div>
              <div><span className="text-muted-foreground">供应商:</span> {item.supplierName || '-'}</div>
              <div><span className="text-muted-foreground">采购日期:</span> {item.purchaseDate || '-'}</div>
              <div><span className="text-muted-foreground">创建时间:</span> {item.createdAt ? new Date(item.createdAt).toLocaleDateString('zh-CN') : '-'}</div>
            </div>

            {/* Spec Details */}
            {item.spec && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">规格参数</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(item.spec).map(([key, val]) => (
                      <div key={key}><span className="text-muted-foreground">{specFieldLabels[key] || key}:</span> {String(val)}</div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">标签</p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag: any) => <Badge key={tag.id} variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">{tag.name}</Badge>)}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {item.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">备注</p>
                  <p className="text-sm text-muted-foreground">{item.notes}</p>
                </div>
              </>
            )}

            {/* Sales History */}
            {item.saleRecords && item.saleRecords.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">销售记录</p>
                  <div className="space-y-2">
                    {item.saleRecords.map((sr: any) => (
                      <div key={sr.id} className="p-2 bg-muted/50 rounded text-sm">
                        <div className="flex justify-between"><span className="font-mono text-xs">{sr.saleNo}</span><span className="font-medium">{formatPrice(sr.actualPrice)}</span></div>
                        <div className="text-xs text-muted-foreground">{sr.saleDate} · {sr.channel === 'store' ? '门店' : '微信'}{sr.customerName ? ` · ${sr.customerName}` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">未找到货品信息</div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ItemDetailDialog;
