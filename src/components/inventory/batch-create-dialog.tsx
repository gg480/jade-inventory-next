'use client';

import React, { useState, useEffect } from 'react';
import { dictsApi, suppliersApi, batchesApi } from '@/lib/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

// ========== Batch Create Dialog ==========
function BatchCreateDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batchCode: '', materialId: '', typeId: '', quantity: 1, totalCost: 0,
    costAllocMethod: 'equal', supplierId: '', purchaseDate: '', notes: '',
  });

  useEffect(() => {
    if (open) {
      dictsApi.getMaterials().then(setMaterials).catch(() => {});
      dictsApi.getTypes().then(setTypes).catch(() => {});
      suppliersApi.getSuppliers().then((s: any) => setSuppliers(s?.items || s || [])).catch(() => {});
    }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      if (!form.batchCode) { toast.error('请输入批次编号'); setSaving(false); return; }
      if (!form.materialId) { toast.error('请选择材质'); setSaving(false); return; }
      if (!form.quantity || form.quantity < 1) { toast.error('请输入有效数量'); setSaving(false); return; }
      await batchesApi.createBatch({
        batchCode: form.batchCode,
        materialId: Number(form.materialId),
        typeId: form.typeId ? Number(form.typeId) : undefined,
        quantity: form.quantity,
        totalCost: form.totalCost || 0,
        costAllocMethod: form.costAllocMethod,
        supplierId: form.supplierId ? Number(form.supplierId) : undefined,
        purchaseDate: form.purchaseDate || undefined,
        notes: form.notes || undefined,
      });
      toast.success('批次创建成功！');
      setForm({ batchCode: '', materialId: '', typeId: '', quantity: 1, totalCost: 0, costAllocMethod: 'equal', supplierId: '', purchaseDate: '', notes: '' });
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || '创建失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>新建批次</DialogTitle><DialogDescription>创建新的通货批次</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1"><Label className="text-xs">批次编号 *</Label><Input value={form.batchCode} onChange={e => setForm(f => ({ ...f, batchCode: e.target.value }))} className="h-9" placeholder="如: HT-20260101-001" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">材质 *</Label>
              <Select value={form.materialId} onValueChange={v => setForm(f => ({ ...f, materialId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="选择材质" /></SelectTrigger>
                <SelectContent>{materials.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">器型</Label>
              <Select value={form.typeId} onValueChange={v => setForm(f => ({ ...f, typeId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="选择器型" /></SelectTrigger>
                <SelectContent>{types.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">数量 *</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} className="h-9" min={1} /></div>
            <div className="space-y-1"><Label className="text-xs">总成本 *</Label><Input type="number" value={form.totalCost || ''} onChange={e => setForm(f => ({ ...f, totalCost: parseFloat(e.target.value) || 0 }))} className="h-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">分摊方式</Label>
              <Select value={form.costAllocMethod} onValueChange={v => setForm(f => ({ ...f, costAllocMethod: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">均摊</SelectItem>
                  <SelectItem value="by_weight">按克重</SelectItem>
                  <SelectItem value="by_price">按售价</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">供应商</Label>
              <Select value={form.supplierId} onValueChange={v => setForm(f => ({ ...f, supplierId: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="选择供应商" /></SelectTrigger>
                <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">采购日期</Label><Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="h-9" /></div>
          <div className="space-y-1"><Label className="text-xs">备注</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-16" placeholder="可选" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>{saving ? '创建中...' : '创建批次'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BatchCreateDialog;
