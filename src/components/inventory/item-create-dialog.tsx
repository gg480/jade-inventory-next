'use client';

import React, { useState, useEffect } from 'react';
import { itemsApi, batchesApi, suppliersApi, dictsApi, pricingApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice } from './shared';
import { MATERIAL_CATEGORIES, parseSpecFields, SPEC_FIELD_LABEL_MAP } from './settings-tab';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { Gem, Layers, Plus, Calculator } from 'lucide-react';

// ========== Item Creation Dialog ==========
function ItemCreateDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<'high_value' | 'batch'>('high_value');
  const [materials, setMaterials] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [pricingSuggestion, setPricingSuggestion] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // 级联选择: 大类 → 材质
  const [materialCategory, setMaterialCategory] = useState('');
  const [batchMaterialCategory, setBatchMaterialCategory] = useState('');

  const [highValueForm, setHighValueForm] = useState({
    materialId: '', typeId: '', costPrice: 0, sellingPrice: 0, name: '',
    origin: '', counter: '', certNo: '', notes: '', supplierId: '', purchaseDate: '',
    weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '',
    tagIds: [] as number[],
  });

  const [batchForm, setBatchForm] = useState({
    batchId: '', sellingPrice: 0, name: '', counter: '', certNo: '', notes: '',
    weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '',
    tagIds: [] as number[],
  });

  useEffect(() => {
    if (open) {
      dictsApi.getMaterials().then(setMaterials).catch(() => {});
      dictsApi.getTypes().then(setTypes).catch(() => {});
      dictsApi.getTags().then(setTags).catch(() => {});
      suppliersApi.getSuppliers().then((s: any) => setSuppliers(s?.items || s || [])).catch(() => {});
      batchesApi.getBatches({ size: 100 }).then((d: any) => setBatches(d?.items || [])).catch(() => {});
    }
  }, [open]);

  // 根据大类筛选材质
  const filteredMaterials = materials.filter((m: any) => {
    if (!materialCategory) return true;
    return m.category === materialCategory;
  });

  const selectedType = types.find((t: any) => String(t.id) === (mode === 'high_value' ? highValueForm.typeId : batchForm.typeId));
  const specFieldsObj = parseSpecFields(selectedType?.specFields);
  const specFieldKeys = Object.keys(specFieldsObj);

  function renderSpecFields(form: typeof highValueForm | typeof batchForm, setForm: (f: any) => void) {
    if (specFieldKeys.length === 0) return null;
    return (
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
                onChange={e => setForm({ ...(form as any), [field]: e.target.value })}
                className="h-9"
                placeholder={label}
              />
            </div>
          );
        })}
      </div>
    );
  }

  function toggleTag(tagId: number, form: typeof highValueForm, setForm: (f: any) => void) {
    const ids = form.tagIds.includes(tagId) ? form.tagIds.filter(id => id !== tagId) : [...form.tagIds, tagId];
    setForm({ ...form, tagIds: ids });
  }

  // 校验必填字段
  function validateRequiredFields(form: typeof highValueForm | typeof batchForm): string | null {
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
    setSaving(true);
    try {
      if (mode === 'high_value') {
        if (!highValueForm.materialId) { toast.error('请选择材质'); setSaving(false); return; }
        if (!highValueForm.sellingPrice) { toast.error('请输入售价'); setSaving(false); return; }
        const validationError = validateRequiredFields(highValueForm);
        if (validationError) { toast.error(validationError); setSaving(false); return; }
        const spec: Record<string, any> = {};
        specFieldKeys.forEach(f => { if ((highValueForm as any)[f]) spec[f] = (highValueForm as any)[f]; });
        await itemsApi.createItem({
          materialId: Number(highValueForm.materialId),
          typeId: highValueForm.typeId ? Number(highValueForm.typeId) : undefined,
          costPrice: highValueForm.costPrice || undefined,
          sellingPrice: highValueForm.sellingPrice,
          name: highValueForm.name || undefined,
          origin: highValueForm.origin || undefined,
          counter: highValueForm.counter ? Number(highValueForm.counter) : undefined,
          certNo: highValueForm.certNo || undefined,
          notes: highValueForm.notes || undefined,
          supplierId: highValueForm.supplierId ? Number(highValueForm.supplierId) : undefined,
          purchaseDate: highValueForm.purchaseDate || undefined,
          spec: Object.keys(spec).length > 0 ? spec : undefined,
          tagIds: highValueForm.tagIds.length > 0 ? highValueForm.tagIds : undefined,
        });
        toast.success('高货入库成功！');
      } else {
        if (!batchForm.batchId) { toast.error('请选择批次'); setSaving(false); return; }
        if (!batchForm.sellingPrice) { toast.error('请输入售价'); setSaving(false); return; }
        const validationError = validateRequiredFields(batchForm);
        if (validationError) { toast.error(validationError); setSaving(false); return; }
        const spec: Record<string, any> = {};
        specFieldKeys.forEach(f => { if ((batchForm as any)[f]) spec[f] = (batchForm as any)[f]; });
        await itemsApi.createItem({
          batchId: Number(batchForm.batchId),
          sellingPrice: batchForm.sellingPrice,
          name: batchForm.name || undefined,
          counter: batchForm.counter ? Number(batchForm.counter) : undefined,
          certNo: batchForm.certNo || undefined,
          notes: batchForm.notes || undefined,
          spec: Object.keys(spec).length > 0 ? spec : undefined,
          tagIds: batchForm.tagIds.length > 0 ? batchForm.tagIds : undefined,
        });
        toast.success('通货入库成功！');
      }
      setHighValueForm({ materialId: '', typeId: '', costPrice: 0, sellingPrice: 0, name: '', origin: '', counter: '', certNo: '', notes: '', supplierId: '', purchaseDate: '', weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '', tagIds: [] });
      setBatchForm({ batchId: '', sellingPrice: 0, name: '', counter: '', certNo: '', notes: '', weight: '', metalWeight: '', size: '', braceletSize: '', beadCount: '', beadDiameter: '', ringSize: '', tagIds: [] });
      setMaterialCategory('');
      setBatchMaterialCategory('');
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || '入库失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增入库</DialogTitle>
          <DialogDescription>添加新货品到库存</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'high_value' ? 'default' : 'outline'} onClick={() => setMode('high_value')} className={mode === 'high_value' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
              <Gem className="h-3 w-3 mr-1" /> 高货入库
            </Button>
            <Button size="sm" variant={mode === 'batch' ? 'default' : 'outline'} onClick={() => setMode('batch')} className={mode === 'batch' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
              <Layers className="h-3 w-3 mr-1" /> 通货入库
            </Button>
          </div>

          {mode === 'high_value' ? (
            <>
              {/* 材质级联选择 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">材质大类</Label>
                  <Select value={materialCategory} onValueChange={v => {
                    setMaterialCategory(v === '_all' ? '' : v);
                    setHighValueForm(f => ({ ...f, materialId: '' }));
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="全部大类" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">全部大类</SelectItem>
                      {MATERIAL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">材质 <span className="text-red-500">*</span></Label>
                  <Select value={highValueForm.materialId} onValueChange={v => setHighValueForm(f => ({ ...f, materialId: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="选择材质" /></SelectTrigger>
                    <SelectContent>{filteredMaterials.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label className="text-xs">器型</Label>
                <Select value={highValueForm.typeId} onValueChange={v => setHighValueForm(f => ({ ...f, typeId: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择器型" /></SelectTrigger>
                  <SelectContent>{types.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">成本价</Label><Input type="number" value={highValueForm.costPrice || ''} onChange={e => setHighValueForm(f => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">售价 <span className="text-red-500">*</span></Label><Input type="number" value={highValueForm.sellingPrice || ''} onChange={e => setHighValueForm(f => ({ ...f, sellingPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
              </div>
              {/* Pricing Calculator */}
              {highValueForm.costPrice > 0 && highValueForm.materialId && (
                <div className="space-y-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pricingLoading} onClick={async () => {
                    setPricingLoading(true);
                    try {
                      const result = await pricingApi.calculate({
                        costPrice: highValueForm.costPrice,
                        materialId: Number(highValueForm.materialId),
                        typeId: highValueForm.typeId ? Number(highValueForm.typeId) : undefined,
                        weight: highValueForm.weight ? parseFloat(highValueForm.weight) : undefined,
                      });
                      setPricingSuggestion(result);
                    } catch (e: any) {
                      toast.error(e.message || '定价计算失败');
                    } finally {
                      setPricingLoading(false);
                    }
                  }}>
                    <Calculator className="h-3 w-3 mr-1" />{pricingLoading ? '计算中...' : '定价建议'}
                  </Button>
                  {pricingSuggestion && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">建议售价</span>
                        <span className="font-bold text-emerald-600">{formatPrice(pricingSuggestion.suggestedPrice)}</span>
                      </div>
                      {pricingSuggestion.floorPrice != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">底价</span>
                          <span className="font-medium">{formatPrice(pricingSuggestion.floorPrice)}</span>
                        </div>
                      )}
                      {pricingSuggestion.grossMargin != null && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">毛利率</span>
                          <span className={`font-medium ${pricingSuggestion.grossMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{(pricingSuggestion.grossMargin * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      <Button size="sm" variant="outline" className="h-6 text-xs w-full mt-1" onClick={() => {
                        if (pricingSuggestion.suggestedPrice) {
                          setHighValueForm(f => ({ ...f, sellingPrice: pricingSuggestion.suggestedPrice }));
                        }
                      }}>应用建议售价</Button>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-1"><Label className="text-xs">名称</Label><Input value={highValueForm.name} onChange={e => setHighValueForm(f => ({ ...f, name: e.target.value }))} className="h-9" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">产地</Label><Input value={highValueForm.origin} onChange={e => setHighValueForm(f => ({ ...f, origin: e.target.value }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">柜台号 <span className="text-red-500">*</span></Label><Input value={highValueForm.counter} onChange={e => setHighValueForm(f => ({ ...f, counter: e.target.value }))} className="h-9" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">证书号</Label><Input value={highValueForm.certNo} onChange={e => setHighValueForm(f => ({ ...f, certNo: e.target.value }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">供应商</Label>
                  <Select value={highValueForm.supplierId} onValueChange={v => setHighValueForm(f => ({ ...f, supplierId: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="选择供应商" /></SelectTrigger>
                    <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label className="text-xs">采购日期</Label><Input type="date" value={highValueForm.purchaseDate} onChange={e => setHighValueForm(f => ({ ...f, purchaseDate: e.target.value }))} className="h-9" /></div>
              {renderSpecFields(highValueForm, (f: any) => setHighValueForm(f))}
              <div className="space-y-1"><Label className="text-xs">备注</Label><Textarea value={highValueForm.notes} onChange={e => setHighValueForm(f => ({ ...f, notes: e.target.value }))} placeholder="可选" className="h-16" /></div>
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
                              <Checkbox checked={highValueForm.tagIds.includes(tag.id)} onCheckedChange={() => toggleTag(tag.id, highValueForm, (f: any) => setHighValueForm(f))} />
                              <span className="text-xs">{tag.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })() }
            </>
          ) : (
            <>
              <div className="space-y-1"><Label className="text-xs">所属批次 <span className="text-red-500">*</span></Label>
                <Select value={batchForm.batchId} onValueChange={v => setBatchForm(f => ({ ...f, batchId: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择批次" /></SelectTrigger>
                  <SelectContent>{batches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.batchCode} - {b.materialName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">售价 <span className="text-red-500">*</span></Label><Input type="number" value={batchForm.sellingPrice || ''} onChange={e => setBatchForm(f => ({ ...f, sellingPrice: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">柜台号 <span className="text-red-500">*</span></Label><Input value={batchForm.counter} onChange={e => setBatchForm(f => ({ ...f, counter: e.target.value }))} className="h-9" /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">名称</Label><Input value={batchForm.name} onChange={e => setBatchForm(f => ({ ...f, name: e.target.value }))} className="h-9" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">证书号</Label><Input value={batchForm.certNo} onChange={e => setBatchForm(f => ({ ...f, certNo: e.target.value }))} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">器型</Label>
                  <Select value={batchForm.typeId} onValueChange={v => setBatchForm(f => ({ ...f, typeId: v }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="选择器型" /></SelectTrigger>
                    <SelectContent>{types.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {renderSpecFields(batchForm, (f: any) => setBatchForm(f))}
              <div className="space-y-1"><Label className="text-xs">备注</Label><Textarea value={batchForm.notes} onChange={e => setBatchForm(f => ({ ...f, notes: e.target.value }))} placeholder="可选" className="h-16" /></div>
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
                              <Checkbox checked={batchForm.tagIds.includes(tag.id)} onCheckedChange={() => toggleTag(tag.id, batchForm, (f: any) => setBatchForm(f))} />
                              <span className="text-xs">{tag.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })() }
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>{saving ? '保存中...' : '确认入库'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ItemCreateDialog;
