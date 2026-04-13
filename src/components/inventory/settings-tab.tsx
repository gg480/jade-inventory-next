'use client';

import React, { useState, useEffect } from 'react';
import { dictsApi, configApi, suppliersApi, metalApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, EmptyState, LoadingSkeleton } from './shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { Plus, Pencil, Trash2, Factory, Calculator, History } from 'lucide-react';

// ========== Settings Tab ==========
function SettingsTab() {
  const [subTab, setSubTab] = useState('dicts');
  const [materials, setMaterials] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Supplier dialog states
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<any>(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', notes: '' });

  // Dict dialog states
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [editMaterial, setEditMaterial] = useState<any>(null);
  const [materialForm, setMaterialForm] = useState({ name: '', subType: '', origin: '', costPerGram: '' });
  const [showCreateType, setShowCreateType] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', specFields: '' });
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [tagForm, setTagForm] = useState({ name: '', groupName: '' });

  // Metal reprice states
  const [repricePreview, setRepricePreview] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const [priceHistoryMaterial, setPriceHistoryMaterial] = useState<string>('');

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [m, t, tg, c, s] = await Promise.all([
          dictsApi.getMaterials(true), dictsApi.getTypes(true), dictsApi.getTags(undefined, true),
          configApi.getConfig(), suppliersApi.getSuppliers(),
        ]);
        setMaterials(m || []);
        setTypes(t || []);
        setTags(tg || []);
        setConfigs(c || []);
        setSuppliers(s?.items || []);
      } catch { toast.error('加载设置数据失败'); } finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  async function toggleMaterialActive(id: number, isActive: boolean) {
    try { await dictsApi.updateMaterial(id, { isActive: !isActive }); setMaterials(m => m.map(x => x.id === id ? { ...x, isActive: !isActive } : x)); toast.success(isActive ? '已停用' : '已启用'); } catch (e: any) { toast.error(e.message); }
  }

  async function updateConfig(key: string, value: string) {
    try { await configApi.updateConfig(key, value); setConfigs(c => c.map(x => x.key === key ? { ...x, value } : x)); toast.success('配置已更新'); } catch (e: any) { toast.error(e.message); }
  }

  // Supplier handlers
  async function fetchSuppliers() {
    try { const s = await suppliersApi.getSuppliers(); setSuppliers(s?.items || []); } catch { toast.error('加载供应商失败'); }
  }

  async function handleCreateSupplier() {
    try { await suppliersApi.createSupplier(supplierForm); toast.success('供应商创建成功'); setShowCreateSupplier(false); setSupplierForm({ name: '', contact: '', notes: '' }); fetchSuppliers(); } catch (e: any) { toast.error(e.message || '创建失败'); }
  }

  async function handleUpdateSupplier() {
    if (!editSupplier) return;
    try { await suppliersApi.updateSupplier(editSupplier.id, supplierForm); toast.success('供应商更新成功'); setEditSupplier(null); setSupplierForm({ name: '', contact: '', notes: '' }); fetchSuppliers(); } catch (e: any) { toast.error(e.message || '更新失败'); }
  }

  async function handleDeleteSupplier() {
    if (!deleteSupplier) return;
    try { await suppliersApi.deleteSupplier(deleteSupplier.id); toast.success('供应商已删除'); setDeleteSupplier(null); fetchSuppliers(); } catch (e: any) { toast.error(e.message || '删除失败'); }
  }

  function openEditSupplierDialog(s: any) {
    setEditSupplier(s);
    setSupplierForm({ name: s.name || '', contact: s.contact || '', notes: s.notes || '' });
  }

  // Dict handlers
  async function handleCreateMaterial() {
    try { await dictsApi.createMaterial({ ...materialForm, costPerGram: materialForm.costPerGram ? parseFloat(materialForm.costPerGram) : undefined }); toast.success('材质创建成功'); setShowCreateMaterial(false); setMaterialForm({ name: '', subType: '', origin: '', costPerGram: '' }); const m = await dictsApi.getMaterials(true); setMaterials(m || []); } catch (e: any) { toast.error(e.message || '创建失败'); }
  }

  async function handleUpdateMaterial() {
    if (!editMaterial) return;
    try { await dictsApi.updateMaterial(editMaterial.id, { ...materialForm, costPerGram: materialForm.costPerGram ? parseFloat(materialForm.costPerGram) : undefined }); toast.success('材质更新成功'); setEditMaterial(null); setMaterialForm({ name: '', subType: '', origin: '', costPerGram: '' }); const m = await dictsApi.getMaterials(true); setMaterials(m || []); } catch (e: any) { toast.error(e.message || '更新失败'); }
  }

  function openEditMaterialDialog(m: any) {
    setEditMaterial(m);
    setMaterialForm({ name: m.name || '', subType: m.subType || '', origin: m.origin || '', costPerGram: m.costPerGram ? String(m.costPerGram) : '' });
  }

  async function handleCreateType() {
    try { const specFieldsArr = typeForm.specFields ? typeForm.specFields.split(',').map(s => s.trim()).filter(Boolean) : []; await dictsApi.createType({ name: typeForm.name, specFields: JSON.stringify(specFieldsArr) }); toast.success('器型创建成功'); setShowCreateType(false); setTypeForm({ name: '', specFields: '' }); const t = await dictsApi.getTypes(true); setTypes(t || []); } catch (e: any) { toast.error(e.message || '创建失败'); }
  }

  async function handleCreateTag() {
    try { await dictsApi.createTag(tagForm); toast.success('标签创建成功'); setShowCreateTag(false); setTagForm({ name: '', groupName: '' }); const tg = await dictsApi.getTags(undefined, true); setTags(tg || []); } catch (e: any) { toast.error(e.message || '创建失败'); }
  }

  // Metal reprice handlers
  async function handlePreviewReprice(materialId: number, newPrice: number) {
    try { const result = await metalApi.previewReprice({ materialId, newPricePerGram: newPrice }); setRepricePreview({ ...result, materialId, newPrice }); } catch (e: any) { toast.error(e.message || '预览失败'); }
  }

  async function handleConfirmReprice() {
    if (!repricePreview) return;
    try { await metalApi.confirmReprice({ materialId: repricePreview.materialId, newPricePerGram: repricePreview.newPrice }); toast.success('调价已确认，相关货品已更新'); setRepricePreview(null); const m = await dictsApi.getMaterials(true); setMaterials(m || []); } catch (e: any) { toast.error(e.message || '确认调价失败'); }
  }

  async function handlePriceHistory(materialId: number, materialName: string) {
    try { const h = await metalApi.getPriceHistory({ material_id: materialId }); setPriceHistory(h || []); setPriceHistoryMaterial(materialName); setShowPriceHistory(true); } catch (e: any) { toast.error(e.message || '加载历史失败'); }
  }

  if (loading) return <LoadingSkeleton />;

  const tagGroups = tags.reduce((acc: any, tag: any) => {
    const g = tag.groupName || '未分组';
    if (!acc[g]) acc[g] = [];
    acc[g].push(tag);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="dicts">字典管理</TabsTrigger>
          <TabsTrigger value="metal">贵金属市价</TabsTrigger>
          <TabsTrigger value="suppliers">供应商</TabsTrigger>
          <TabsTrigger value="config">系统配置</TabsTrigger>
        </TabsList>

        <TabsContent value="dicts" className="mt-4 space-y-4">
          {/* Materials */}
          <Card>
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">材质 ({materials.length})</CardTitle><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={() => { setShowCreateMaterial(true); setMaterialForm({ name: '', subType: '', origin: '', costPerGram: '' }); }}><Plus className="h-3 w-3 mr-1" />新增材质</Button></div></CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>子类</TableHead><TableHead>产地</TableHead><TableHead className="text-right">克重单价</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {materials.map(m => (
                      <TableRow key={m.id} className={!m.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{m.subType || '-'}</TableCell>
                        <TableCell>{m.origin || '-'}</TableCell>
                        <TableCell className="text-right">{m.costPerGram ? `¥${m.costPerGram}` : '-'}</TableCell>
                        <TableCell><Badge variant={m.isActive ? 'default' : 'secondary'} className={m.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : ''}>{m.isActive ? '启用' : '停用'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600" onClick={() => openEditMaterialDialog(m)} title="编辑"><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleMaterialActive(m.id, m.isActive)}>{m.isActive ? '停用' : '启用'}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {/* Types */}
          <Card>
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">器型 ({types.length})</CardTitle><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={() => { setShowCreateType(true); setTypeForm({ name: '', specFields: '' }); }}><Plus className="h-3 w-3 mr-1" />新增器型</Button></div></CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>规格字段</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {types.map(t => (
                      <TableRow key={t.id} className={!t.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.specFields ? JSON.parse(t.specFields).join(', ') : '-'}</TableCell>
                        <TableCell><Badge variant={t.isActive ? 'default' : 'secondary'} className={t.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : ''}>{t.isActive ? '启用' : '停用'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {/* Tags */}
          <Card>
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">标签 ({tags.length})</CardTitle><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={() => { setShowCreateTag(true); setTagForm({ name: '', groupName: '' }); }}><Plus className="h-3 w-3 mr-1" />新增标签</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(tagGroups).map(([group, groupTags]: [string, any]) => (
                  <div key={group}>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {groupTags.map((tag: any) => (
                        <Badge key={tag.id} variant={tag.isActive ? 'default' : 'secondary'} className={tag.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'opacity-50'}>{tag.name}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metal" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">贵金属市价管理</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">当前配置了克重单价的材质，市价变动时可批量重算在库货品零售价。</p>
              <div className="space-y-3">
                {materials.filter(m => m.costPerGram).map(m => (
                  <div key={m.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{m.name}{m.subType ? ` (${m.subType})` : ''}</p>
                        <p className="text-sm text-muted-foreground">当前: ¥{m.costPerGram}/克</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" className="w-28 h-8 text-sm" placeholder="新单价" id={`metal-price-${m.id}`}
                          onBlur={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (val && val !== m.costPerGram) {
                              try { await metalApi.updatePrice({ materialId: m.id, pricePerGram: val }); setMaterials(ms => ms.map(x => x.id === m.id ? { ...x, costPerGram: val } : x)); toast.success(`${m.name}市价已更新为 ¥${val}/克`); } catch (e: any) { toast.error(e.message); }
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                        const input = document.getElementById(`metal-price-${m.id}`) as HTMLInputElement;
                        const val = input ? parseFloat(input.value) : 0;
                        if (val && val > 0) { handlePreviewReprice(m.id, val); }
                        else { toast.error('请先输入新单价'); }
                      }}><Calculator className="h-3 w-3 mr-1" />预览调价</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePriceHistory(m.id, m.name)}><History className="h-3 w-3 mr-1" />历史记录</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">供应商 ({suppliers.length})</CardTitle><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={() => { setShowCreateSupplier(true); setSupplierForm({ name: '', contact: '', notes: '' }); }}><Plus className="h-3 w-3 mr-1" />新增供应商</Button></div></CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <EmptyState icon={Factory} title="暂无供应商" desc="还没有添加任何供应商" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suppliers.map((s: any) => (
                    <div key={s.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">{s.name}</p>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-amber-600" onClick={() => openEditSupplierDialog(s)} title="编辑"><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => setDeleteSupplier(s)} title="删除"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      {s.contact && <p className="text-sm text-muted-foreground">{s.contact}</p>}
                      {s.notes && <p className="text-sm text-muted-foreground truncate">{s.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">系统配置</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configs.map(c => (
                  <div key={c.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div><p className="font-medium">{c.description || c.key}</p><p className="text-xs text-muted-foreground font-mono">{c.key}</p></div>
                    <Input type="text" value={c.value} className="w-32 h-8 text-sm"
                      onBlur={e => { if (e.target.value !== c.value) updateConfig(c.key, e.target.value); }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Supplier Dialog */}
      <Dialog open={showCreateSupplier} onOpenChange={setShowCreateSupplier}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增供应商</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} placeholder="供应商名称" /></div>
            <div className="space-y-1"><Label>联系人</Label><Input value={supplierForm.contact} onChange={e => setSupplierForm(f => ({ ...f, contact: e.target.value }))} placeholder="联系方式" /></div>
            <div className="space-y-1"><Label>备注</Label><Textarea value={supplierForm.notes} onChange={e => setSupplierForm(f => ({ ...f, notes: e.target.value }))} placeholder="可选" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSupplier(false)}>取消</Button>
            <Button onClick={handleCreateSupplier} className="bg-emerald-600 hover:bg-emerald-700" disabled={!supplierForm.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={editSupplier !== null} onOpenChange={open => { if (!open) setEditSupplier(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑供应商</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={supplierForm.name} onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>联系人</Label><Input value={supplierForm.contact} onChange={e => setSupplierForm(f => ({ ...f, contact: e.target.value }))} /></div>
            <div className="space-y-1"><Label>备注</Label><Textarea value={supplierForm.notes} onChange={e => setSupplierForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSupplier(null)}>取消</Button>
            <Button onClick={handleUpdateSupplier} className="bg-emerald-600 hover:bg-emerald-700" disabled={!supplierForm.name}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Confirm Dialog */}
      <Dialog open={deleteSupplier !== null} onOpenChange={open => { if (!open) setDeleteSupplier(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle><DialogDescription>确定要删除供应商「{deleteSupplier?.name}」吗？此操作不可恢复。</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSupplier(null)}>取消</Button>
            <Button onClick={handleDeleteSupplier} className="bg-red-600 hover:bg-red-700">确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Material Dialog */}
      <Dialog open={showCreateMaterial} onOpenChange={setShowCreateMaterial}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增材质</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={materialForm.name} onChange={e => setMaterialForm(f => ({ ...f, name: e.target.value }))} placeholder="如: 和田玉" /></div>
            <div className="space-y-1"><Label>子类</Label><Input value={materialForm.subType} onChange={e => setMaterialForm(f => ({ ...f, subType: e.target.value }))} placeholder="如: 籽料、山料" /></div>
            <div className="space-y-1"><Label>产地</Label><Input value={materialForm.origin} onChange={e => setMaterialForm(f => ({ ...f, origin: e.target.value }))} placeholder="如: 新疆" /></div>
            <div className="space-y-1"><Label>克重单价</Label><Input type="number" value={materialForm.costPerGram} onChange={e => setMaterialForm(f => ({ ...f, costPerGram: e.target.value }))} placeholder="如: 500" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateMaterial(false)}>取消</Button>
            <Button onClick={handleCreateMaterial} className="bg-emerald-600 hover:bg-emerald-700" disabled={!materialForm.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={editMaterial !== null} onOpenChange={open => { if (!open) setEditMaterial(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑材质</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={materialForm.name} onChange={e => setMaterialForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>子类</Label><Input value={materialForm.subType} onChange={e => setMaterialForm(f => ({ ...f, subType: e.target.value }))} /></div>
            <div className="space-y-1"><Label>产地</Label><Input value={materialForm.origin} onChange={e => setMaterialForm(f => ({ ...f, origin: e.target.value }))} /></div>
            <div className="space-y-1"><Label>克重单价</Label><Input type="number" value={materialForm.costPerGram} onChange={e => setMaterialForm(f => ({ ...f, costPerGram: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaterial(null)}>取消</Button>
            <Button onClick={handleUpdateMaterial} className="bg-emerald-600 hover:bg-emerald-700" disabled={!materialForm.name}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Type Dialog */}
      <Dialog open={showCreateType} onOpenChange={setShowCreateType}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增器型</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="如: 手镯" /></div>
            <div className="space-y-1"><Label>规格字段</Label><Input value={typeForm.specFields} onChange={e => setTypeForm(f => ({ ...f, specFields: e.target.value }))} placeholder="逗号分隔，如: weight,size,braceletSize" />
              <p className="text-xs text-muted-foreground">可选: weight(克重), metalWeight(金重), size(尺寸), braceletSize(圈口), beadCount(颗数), beadDiameter(珠径), ringSize(戒圈)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateType(false)}>取消</Button>
            <Button onClick={handleCreateType} className="bg-emerald-600 hover:bg-emerald-700" disabled={!typeForm.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={showCreateTag} onOpenChange={setShowCreateTag}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增标签</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={tagForm.name} onChange={e => setTagForm(f => ({ ...f, name: e.target.value }))} placeholder="如: 限定款" /></div>
            <div className="space-y-1"><Label>分组</Label><Input value={tagForm.groupName} onChange={e => setTagForm(f => ({ ...f, groupName: e.target.value }))} placeholder="如: 风格" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTag(false)}>取消</Button>
            <Button onClick={handleCreateTag} className="bg-emerald-600 hover:bg-emerald-700" disabled={!tagForm.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reprice Preview Dialog */}
      <Dialog open={repricePreview !== null} onOpenChange={open => { if (!open) setRepricePreview(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>调价预览</DialogTitle><DialogDescription>以下货品将受影响</DialogDescription></DialogHeader>
          {repricePreview && (
            <div className="space-y-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-sm">
                <p>新单价: <span className="font-bold text-emerald-600">¥{repricePreview.newPrice}/克</span></p>
                <p>影响货品: <span className="font-bold">{repricePreview.affectedItems?.length || 0} 件</span></p>
              </div>
              {repricePreview.affectedItems && repricePreview.affectedItems.length > 0 ? (
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>名称</TableHead><TableHead className="text-right">原价</TableHead><TableHead className="text-right">新价</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {repricePreview.affectedItems.map((item: any) => (
                        <TableRow key={item.itemId}>
                          <TableCell className="font-mono text-xs">{item.skuCode}</TableCell>
                          <TableCell className="text-sm">{item.name || '-'}</TableCell>
                          <TableCell className="text-right text-sm">{formatPrice(item.oldPrice)}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-emerald-600">{formatPrice(item.newPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">没有受影响的在库货品</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepricePreview(null)}>取消</Button>
            <Button onClick={handleConfirmReprice} className="bg-emerald-600 hover:bg-emerald-700" disabled={!repricePreview?.affectedItems?.length}>确认调价</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={showPriceHistory} onOpenChange={setShowPriceHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>价格历史 - {priceHistoryMaterial}</DialogTitle></DialogHeader>
          {priceHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">暂无历史记录</p>
          ) : (
            <div className="max-h-72 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader><TableRow><TableHead>日期</TableHead><TableHead className="text-right">单价(元/克)</TableHead><TableHead>操作人</TableHead></TableRow></TableHeader>
                <TableBody>
                  {priceHistory.map((h: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{h.effectiveDate || h.createdAt?.slice(0, 10) || '-'}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">¥{h.pricePerGram}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{h.updatedBy || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowPriceHistory(false)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsTab;
