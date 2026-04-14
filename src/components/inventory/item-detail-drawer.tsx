'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { itemsApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge } from './shared';
import ImageLightbox from './image-lightbox';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Pencil, ShoppingCart, Printer, RotateCcw, Gem, Layers, MapPin,
  CalendarDays, FileCheck, Info, Tag, Clock, ArrowUp, ArrowDown,
  Upload, ImageIcon, ZoomIn, Star, ImageOff, Package,
} from 'lucide-react';

// ========== Tag Color Map ==========
const TAG_COLOR_PALETTE = [
  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
];
const TAG_COLOR_CACHE: Record<string, string> = {};
function getTagColor(tagName: string): string {
  if (!TAG_COLOR_CACHE[tagName]) {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash += tagName.charCodeAt(i);
    }
    TAG_COLOR_CACHE[tagName] = TAG_COLOR_PALETTE[Math.abs(hash) % TAG_COLOR_PALETTE.length];
  }
  return TAG_COLOR_CACHE[tagName];
}

// Image with loading state helper
function ImageWithLoading({ src, alt, className, onClick }: { src: string; alt: string; className?: string; onClick?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={`relative ${className || ''}`} onClick={onClick}>
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center w-full h-full bg-muted/50 rounded-lg border border-dashed border-muted-foreground/20 text-muted-foreground">
          <ImageOff className="h-6 w-6 mb-1" />
          <span className="text-[10px]">加载失败</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      )}
    </div>
  );
}

// Spec field label map
const SPEC_LABEL_MAP: Record<string, { label: string; unit?: string }> = {
  weight: { label: '重量', unit: 'g' },
  metalWeight: { label: '金重', unit: 'g' },
  size: { label: '尺寸', unit: 'mm' },
  braceletSize: { label: '圈口' },
  beadCount: { label: '颗数' },
  beadDiameter: { label: '珠径', unit: 'mm' },
  ringSize: { label: '戒圈' },
};

function formatSpecValue(key: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  const displayVal = typeof val === 'object' ? (val as Record<string, unknown>)?.value ?? '' : val;
  const spec = SPEC_LABEL_MAP[key];
  if (spec?.unit) {
    return `${displayVal} ${spec.unit}`;
  }
  return String(displayVal);
}

// Status display config
const STATUS_CONFIG: Record<string, { label: string; colorClass: string }> = {
  in_stock: { label: '在库', colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  sold: { label: '已售', colorClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300' },
  returned: { label: '已退', colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

// ========== Item Detail Drawer ==========
interface ItemDetailDrawerProps {
  item: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: any) => void;
  onSell: (item: any) => void;
  onReturn: (item: any) => void;
  onPrintLabel: (item: any) => void;
}

function ItemDetailDrawer({ item, open, onOpenChange, onEdit, onSell, onReturn, onPrintLabel }: ItemDetailDrawerProps) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const data = await itemsApi.getItem(id);
      setDetail(data);
      if (data.images && data.images.length > 0) {
        const coverIdx = data.images.findIndex((img: any) => img.isCover);
        setSelectedImageIndex(coverIdx >= 0 ? coverIdx : 0);
      }
    } catch {
      toast.error('加载货品详情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && item?.id) {
      fetchDetail(item.id);
    } else {
      setDetail(null);
      setSelectedImageIndex(0);
    }
  }, [open, item?.id, fetchDetail]);

  async function handleUploadImage(file: File) {
    if (!item?.id) return;
    setUploading(true);
    try {
      await itemsApi.uploadImage(item.id, file);
      toast.success('图片上传成功');
      fetchDetail(item.id);
    } catch (e: any) {
      toast.error(e.message || '上传失败');
    } finally {
      setUploading(false);
    }
  }

  // Use detail data if available, fall back to item prop
  const displayItem = detail || item;
  const images = displayItem?.images || [];
  const specFields = displayItem?.spec ? (typeof displayItem.spec === 'object' ? displayItem.spec : (() => { try { return JSON.parse(displayItem.spec); } catch { return {}; } })()) : (displayItem?.specFields ? (typeof displayItem.specFields === 'string' ? (() => { try { return JSON.parse(displayItem.specFields); } catch { return {}; } })() : displayItem.specFields) : {});
  const itemTags: string[] = displayItem?.tags ? (Array.isArray(displayItem.tags) ? displayItem.tags.map((t: any) => typeof t === 'string' ? t : t.name) : typeof displayItem.tags === 'string' ? displayItem.tags.split(',').filter(Boolean) : []) : [];

  const cost = displayItem?.allocatedCost || displayItem?.estimatedCost || displayItem?.costPrice || 0;
  const sellingPrice = displayItem?.sellingPrice || 0;
  const floorPrice = displayItem?.floorPrice || 0;
  const profit = sellingPrice - cost;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  const statusInfo = STATUS_CONFIG[displayItem?.status] || { label: displayItem?.status || '—', colorClass: 'bg-muted text-muted-foreground' };

  return (
    <>
      <Sheet open={open && !lightboxOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[480px] max-w-[90vw] p-0 flex flex-col gap-0">
          <SheetHeader className="p-4 pb-3 border-b border-border space-y-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg font-mono text-emerald-700 dark:text-emerald-400">
                  {displayItem?.skuCode || '—'}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-sm text-foreground font-medium truncate">
                  {displayItem?.name || displayItem?.skuCode || ''}
                </SheetDescription>
              </div>
              <Badge className={`shrink-0 text-xs px-2.5 py-1 ${statusInfo.colorClass}`}>
                {statusInfo.label}
              </Badge>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : displayItem ? (
                <>
                  {/* Image Gallery */}
                  {images.length > 0 ? (
                    <div className="space-y-2">
                      {/* Main image display */}
                      <div
                        className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden cursor-zoom-in group"
                        onClick={() => setLightboxOpen(true)}
                      >
                        {uploading && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
                            <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-2" />
                            <span className="text-sm text-emerald-600 font-medium">上传中...</span>
                          </div>
                        )}
                        <ImageWithLoading
                          src={images[selectedImageIndex]?.url || images[selectedImageIndex]?.filename}
                          alt={`货品图片 ${selectedImageIndex + 1}`}
                          className="w-full h-full"
                        />
                        {images[selectedImageIndex]?.isCover && (
                          <div className="absolute top-2 left-2">
                            <Badge className="h-5 text-[10px] bg-emerald-600"><Star className="h-3 w-3 mr-0.5" />封面</Badge>
                          </div>
                        )}
                        {/* Zoom hint */}
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <ZoomIn className="h-3 w-3" /> 点击放大
                        </div>
                      </div>

                      {/* Thumbnail strip */}
                      {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                          {images.map((img: any, idx: number) => (
                            <div
                              key={img.id || idx}
                              className={`relative shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 cursor-pointer transition-all duration-200 ${idx === selectedImageIndex ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-transparent hover:border-muted-foreground/30'}`}
                              onClick={() => setSelectedImageIndex(idx)}
                            >
                              <ImageWithLoading
                                src={img.url || img.filename}
                                alt={`缩略图 ${idx + 1}`}
                                className="w-full h-full"
                              />
                              {img.isCover && (
                                <div className="absolute top-0 left-0 bg-emerald-600 text-white text-[8px] px-0.5 leading-3">★</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload button */}
                      <label className="cursor-pointer inline-block">
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
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto mb-1" />
                        <p className="text-xs mb-2">暂无图片</p>
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
                    </div>
                  )}

                  {/* Basic Info Grid */}
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                      <Package className="h-4 w-4 text-emerald-600" />
                      基本信息
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {displayItem.materialName && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">材质</p>
                          <p className="font-medium flex items-center gap-1"><Gem className="h-3 w-3 text-muted-foreground" />{displayItem.materialName}</p>
                        </div>
                      )}
                      {displayItem.typeName && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">器型</p>
                          <p className="font-medium">{displayItem.typeName}</p>
                        </div>
                      )}
                      {displayItem.origin && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">产地</p>
                          <p className="font-medium">{displayItem.origin}</p>
                        </div>
                      )}
                      {displayItem.counter != null && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">柜台号</p>
                          <p className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{displayItem.counter}号柜</p>
                        </div>
                      )}
                      {displayItem.purchaseDate && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">采购日期</p>
                          <p className="font-medium flex items-center gap-1"><CalendarDays className="h-3 w-3 text-muted-foreground" />{displayItem.purchaseDate}</p>
                        </div>
                      )}
                      {displayItem.certNo && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">证书号</p>
                          <p className="font-medium font-mono text-xs flex items-center gap-1"><FileCheck className="h-3 w-3 text-muted-foreground" />{displayItem.certNo}</p>
                        </div>
                      )}
                      {displayItem.batchCode && (
                        <div className="col-span-2 space-y-0.5">
                          <p className="text-xs text-muted-foreground">所属批次</p>
                          <Badge variant="outline" className="font-mono text-xs cursor-pointer hover:bg-muted">
                            <Layers className="h-2.5 w-2.5 mr-1" />{displayItem.batchCode}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Pricing Section */}
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                      <span className="text-emerald-600">¥</span>
                      价格信息
                    </h4>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">成本价</p>
                          <p className="font-semibold tabular-nums">{formatPrice(cost)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">售价</p>
                          <p className="font-bold text-emerald-700 dark:text-emerald-300 tabular-nums text-lg">{formatPrice(sellingPrice)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">底价</p>
                          <p className="font-semibold tabular-nums">{floorPrice > 0 ? formatPrice(floorPrice) : '—'}</p>
                        </div>
                      </div>
                      <Separator className="bg-emerald-200 dark:bg-emerald-800" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">潜在利润</p>
                          <p className={`font-bold tabular-nums flex items-center gap-1 ${profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600'}`}>
                            {profit >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                            {profit >= 0 ? '+' : ''}{formatPrice(profit)}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">利润率</p>
                          <p className={`font-bold tabular-nums ${margin >= 30 ? 'text-emerald-700 dark:text-emerald-300' : margin >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600'}`}>
                            {margin.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Inventory Days */}
                  {displayItem.ageDays != null && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <StatusBadge status={displayItem.status} />
                        <Badge variant="outline" className={`text-xs ${displayItem.ageDays < 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' : displayItem.ageDays <= 90 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          库龄 {displayItem.ageDays}天
                        </Badge>
                      </div>
                    </>
                  )}

                  {/* Sold/Returned profit info */}
                  {(displayItem.status === 'sold' || displayItem.status === 'returned') && sellingPrice > 0 && (
                    <div className={`p-3 rounded-lg ${displayItem.status === 'sold' ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'}`}>
                      <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        {displayItem.status === 'sold' ? <ArrowUp className="h-3 w-3 text-emerald-600" /> : <RotateCcw className="h-3 w-3 text-amber-600" />}
                        {displayItem.status === 'sold' ? '销售记录' : '已退货'}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">售价</span>
                          <span className="font-medium text-emerald-600">{formatPrice(sellingPrice)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">成本</span>
                          <span className="font-medium">{formatPrice(cost)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                          <span className="text-muted-foreground">利润</span>
                          <span className={`font-bold ${(sellingPrice - cost) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {(sellingPrice - cost) >= 0 ? '+' : ''}{formatPrice(sellingPrice - cost)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Specifications */}
                  {Object.keys(specFields).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                          <Info className="h-4 w-4 text-emerald-600" />
                          规格参数
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(specFields).map(([key, val]) => {
                            const specLabel = SPEC_LABEL_MAP[key]?.label || key;
                            return (
                              <div key={key} className="p-2 bg-muted/50 rounded-md">
                                <p className="text-[10px] text-muted-foreground">{specLabel}</p>
                                <p className="text-sm font-medium">{formatSpecValue(key, val)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Tags */}
                  {itemTags.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                          <Tag className="h-4 w-4 text-purple-500" />
                          标签
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {itemTags.map((tag: string) => (
                            <span key={tag} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {displayItem.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-2">备注</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-md p-3">{displayItem.notes}</p>
                      </div>
                    </>
                  )}

                  {/* Sale Records (from detail) */}
                  {detail?.saleRecords && detail.saleRecords.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-3">销售记录</h4>
                        <div className="space-y-2">
                          {detail.saleRecords.map((sr: any) => (
                            <div key={sr.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                              <div className="flex justify-between items-center">
                                <span className="font-mono text-xs text-muted-foreground">{sr.saleNo}</span>
                                <span className="font-medium">{formatPrice(sr.actualPrice)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {sr.saleDate} · {sr.channel === 'store' ? '门店' : '微信'}{sr.customer?.name ? ` · ${sr.customer.name}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Bottom spacing */}
                  <div className="h-2" />
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground">未找到货品信息</div>
              )}
            </div>
          </ScrollArea>

          {/* Action Buttons Footer */}
          {!loading && displayItem && (
            <div className="border-t border-border p-3 flex items-center gap-2 bg-background">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 text-xs"
                onClick={() => { onOpenChange(false); onEdit(displayItem); }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />编辑
              </Button>
              {displayItem.status === 'in_stock' && (
                <Button
                  size="sm"
                  className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { onOpenChange(false); onSell(displayItem); }}
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" />销售出库
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 text-xs"
                onClick={() => { onOpenChange(false); onPrintLabel(displayItem); }}
              >
                <Printer className="h-3.5 w-3.5 mr-1" />标签打印
              </Button>
              {displayItem.status === 'sold' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950/30"
                  onClick={() => { onOpenChange(false); onReturn(displayItem); }}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />退货
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Lightbox overlay */}
      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          key={`lightbox-${selectedImageIndex}`}
          images={images.map((img: any) => ({ url: img.url || img.filename, id: img.id, isCover: img.isCover }))}
          initialIndex={selectedImageIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

export default ItemDetailDrawer;
