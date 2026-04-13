'use client';

import React, { useState, useEffect } from 'react';
import { itemsApi, dictsApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, StatusBadge } from './shared';
import { parseSpecFields, SPEC_FIELD_LABEL_MAP } from './settings-tab';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

// ========== Item Edit Dialog ==========
function ItemEditDialog({ itemId, open, onOpenChange, onSuccess }: { itemId: number | null; open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const [item, setItem] = useState<any>(null);
  const [types, setTypes] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', sellingPrice: 0, floorPrice: 0, counter: '', certNo: '', notes: '', origin: '',
    tagIds: [] as number[],
    weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '',
  });

  useEffect(() => {
    if (open) {
      dictsApi.getTypes().then(setTypes).catch(() => {});
      dictsApi.getTags().then(setTags).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open && itemId) {
      setLoading(true);
      itemsApi.getItem(itemId).then((data: any) => {
        setItem(data);
        const specObj: any = data.spec || {};
        setForm({
          name: data.name || '',
          sellingPrice: data.sellingPrice || 0,
          floorPrice: data.floorPrice || 0,
          counter: data.counter != null ? String(data.counter) : '',
          certNo: data.certNo || '',
          notes: data.notes || '',
          origin: data.origin || '',
          tagIds: data.tags ? data.tags.map((t: any) => t.id) : [],
          weight: specObj.weight || '',
          metalWeight: specObj.metalWeight || '',
          size: specObj.size || '',
          braceletSize: specObj.braceletSize || '',
          beadCount: specObj.beadCount || '',
          beadDiameter: specObj.beadDiameter || '',
          ringSize: specObj.ringSize || '',
        });
      }).catch(() => {
        toast.error('加载货品信息失败');
      }).finally(() => setLoading(false));
    } else {
      setItem(null);
    }
  }, [open, itemId]);

  const selectedType = types.find((t: any) => String(t.id) === String(item?.typeId));
  const specFieldsObj = parseSpecFields(selectedType?.specFields);
  const specFieldKeys = Object.keys(specFieldsObj);

  function toggleTag(tagId: number) {
    const ids = form.tagIds.includes(tagId) ? form.tagIds.filter(id => id !== tagId) : [...form.tagIds, tagId];
    setForm(f => ({ ...f, tagIds: ids }));
  }

  // 校验必填字段
  function validateRequiredFields(): string | null {
    // 柜台号必填
    if (!form.counter) return '请输入柜台号';
    // 器型必填规格字段
    for (const field of specFieldKeys) {
      if (specFieldsObj[field]?.required && !(form as any)[field]) {
        const label = SPEC_FIELD_LABEL_MAP[field] || field;
        return `请输入${label}`;
      }
    }
    return null;
  }

  async function handleSave() {
    if (!itemId) return;
    const validationError = validateRequiredFields();
    if (validationError) { toast.error(validationError); return; }

    setSaving(true);
    try {
      const spec: Record<string, any> = {};
      specFieldKeys.forEach(f => { if ((form as any)[f]) spec[f] = (form as any)[f]; });
      await itemsApi.updateItem(itemId, {
        name: form.name || undefined,
        sellingPrice: form.sellingPrice,
        floorPrice: form.floorPrice || undefined,
        counter: form.counter ? Number(form.counter) : undefined,
        certNo: form.certNo || undefined,
        notes: form.notes || undefined,
        origin: form.origin || undefined,
        spec: Object.keys(spec).length > 0 ? spec : undefined,
        tagIds: form.tagIds,
      });
      toast.success('货品更新成功！');
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || '更新失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑货品</DialogTitle>
          <DialogDescription>{item?.skuCode || ''}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3 py-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div>
        ) : item ? (
          <div className="space-y-4 py-2">
            {/* Non-editable info */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded-lg">
              <div><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{item.skuCode}</span></div>
              <div><span className="text-muted-foreground">材质:</span> {item.materialName || '-'}</div>
              <div><span className="text-muted-foreground">器型:</span> {item.typeName || '-'}</div>
              <div><span className="text-muted-foreground">状态:</span> <StatusBadge status={item.status} /></div>
              <div><span className="text-muted-foreground">成本价:</span> {formatPrice(item.costPrice)}</div>
              <div><span className="text-muted-foreground">分摊成本:</span> {formatPrice(item.allocatedCost)}</div>
            </div>

            {/* Editable fields */}
            <div className="space-y-1"><Label className="text-xs">名称</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">售价</Label><Input type="number" value={form.sellingPrice || ''} onChange={e => setForm(f => ({ ...f, sellingPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">底价</Label><Input type="number" value={form.floorPrice || ''} onChange={e => setForm(f => ({ ...f, floorPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">产地</Label><Input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">柜台号 <span className="text-red-500">*</span></Label><Input value={form.counter} onChange={e => setForm(f => ({ ...f, counter: e.target.value }))} className="h-9" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">证书号</Label><Input value={form.certNo} onChange={e => setForm(f => ({ ...f, certNo: e.target.value }))} className="h-9" /></div>

            {/* Dynamic spec fields */}
            {specFieldKeys.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {specFieldKeys.map((field: string) => {
                  const isRequired = specFieldsObj[field]?.required ?? false;
                  const label = SPEC_FIELD_LABEL_MAP[field] || field;
                  return (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">
                        {label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
                      </Label>
                      <Input
                        type={field === 'beadCount' ? 'number' : 'text'}
                        value={(form as any)[field] || ''}
                        onChange={e => setForm({ ...form, [field]: e.target.value })}
                        className="h-9"
                        placeholder={label}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-1"><Label className="text-xs">备注</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="可选" className="h-16" /></div>

            {/* Tags - Grouped */}
            {tags.length > 0 && (() => {
              const activeTags = tags.filter((t: any) => t.isActive);
              const groups = activeTags.reduce((acc: any, tag: any) => {
                const g = tag.groupName || '未分组';
                if (!acc[g]) acc[g] = [];
                acc[g].push(tag);
                return acc;
              }, {});
              const groupKeys = Object.keys(groups);
              const singleGroup = groupKeys.length === 1 && groupKeys[0] === '未分组';
              return (
                <div className="space-y-2">
                  <Label className="text-xs">标签</Label>
                  {groupKeys.map(group => (
                    <div key={group}>
                      {!singleGroup && <p className="text-xs font-medium text-muted-foreground mb-1">{group}</p>}
                      <div className="flex flex-wrap gap-2">
                        {groups[group].map((tag: any) => (
                          <label key={tag.id} className="flex items-center gap-1 cursor-pointer">
                            <Checkbox checked={form.tagIds.includes(tag.id)} onCheckedChange={() => toggleTag(tag.id)} />
                            <span className="text-xs">{tag.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">未找到货品信息</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700" disabled={saving || loading}>{saving ? '保存中...' : '保存修改'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ItemEditDialog;
