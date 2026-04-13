'use client';

import React, { useState, useEffect } from 'react';
import { dictsApi, configApi, suppliersApi, metalApi, backupApi, importApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatPrice, EmptyState, LoadingSkeleton } from './shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { Plus, Pencil, Trash2, Factory, Calculator, History, Download, Upload, Database, AlertTriangle, Loader2, FileSpreadsheet, FileDown, CheckCircle, XCircle, Clock, Phone } from 'lucide-react';

// ========== 材质大类选项 ==========
const MATERIAL_CATEGORIES = [
  { value: '玉', label: '玉' },
  { value: '贵金属', label: '贵金属' },
  { value: '水晶', label: '水晶' },
  { value: '文玩', label: '文玩' },
  { value: '其他', label: '其他' },
];

// ========== 规格字段定义 ==========
const SPEC_FIELD_OPTIONS = [
  { key: 'weight', label: '克重(g)' },
  { key: 'metalWeight', label: '金重(g)' },
  { key: 'size', label: '尺寸' },
  { key: 'braceletSize', label: '圈口' },
  { key: 'beadCount', label: '颗数' },
  { key: 'beadDiameter', label: '珠径' },
  { key: 'ringSize', label: '戒圈' },
] as const;

const SPEC_FIELD_LABEL_MAP: Record<string, string> = Object.fromEntries(
  SPEC_FIELD_OPTIONS.map(f => [f.key, f.label])
);

/** 解析 specFields（向后兼容数组格式） */
function parseSpecFields(raw: string | null | undefined): Record<string, { required: boolean }> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // 旧格式：["weight","braceletSize"] → {"weight":{"required":false},"braceletSize":{"required":false}}
      const obj: Record<string, { required: boolean }> = {};
      parsed.forEach((key: string) => { obj[key] = { required: false }; });
      return obj;
    }
    return parsed;
  } catch {
    return {};
  }
}

/** 将 specFields 对象格式化为中文展示 */
function formatSpecFieldsDisplay(raw: string | null | undefined): string {
  const fields = parseSpecFields(raw);
  const keys = Object.keys(fields);
  if (keys.length === 0) return '-';
  return keys.map(k => {
    const label = SPEC_FIELD_LABEL_MAP[k] || k;
    const required = fields[k]?.required;
    return required ? `${label}*` : label;
  }).join('、');
}

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
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', notes: '' });

  // Dict dialog states
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [editMaterial, setEditMaterial] = useState<any>(null);
  const [materialForm, setMaterialForm] = useState({ name: '', category: '', subType: '', origin: '', costPerGram: '' });
  const [showCreateType, setShowCreateType] = useState(false);
  const [editType, setEditType] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<any>(null);
  // typeForm.specFields now stores Record<string, { required: boolean }>
  const [typeForm, setTypeForm] = useState<{ name: string; specFields: Record<string, { required: boolean }> }>({ name: '', specFields: {} });
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [tagForm, setTagForm] = useState({ name: '', groupName: '' });
  const [tagGroupFilter, setTagGroupFilter] = useState('');
  const [editTag, setEditTag] = useState<any>(null);

  // Metal reprice states
  const [repricePreview, setRepricePreview] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const [priceHistoryMaterial, setPriceHistoryMaterial] = useState<string>('');

  // Backup/restore states
  const [restoring, setRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Import states
  const [importType, setImportType] = useState<'items' | 'sales'>('items');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [autoCreate, setAutoCreate] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: string[][] } | null>(null);

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
    try { await suppliersApi.createSupplier(supplierForm); toast.success('供应商创建成功'); setShowCreateSupplier(false); setSupplierForm({ name: '', contact: '', phone: '', notes: '' }); fetchSuppliers(); } catch (e: any) { toast.error(e.message || '创建失败'); }
  }

  async function handleUpdateSupplier() {
    if (!editSupplier) return;
    try { await suppliersApi.updateSupplier(editSupplier.id, supplierForm); toast.success('供应商更新成功'); setEditSupplier(null); setSupplierForm({ name: '', contact: '', phone: '', notes: '' }); fetchSuppliers(); } catch (e: any) { toast.error(e.message || '更新失败'); }
  }

  async function handleDeleteSupplier() {
    if (!deleteSupplier) return;
    try { await suppliersApi.deleteSupplier(deleteSupplier.id); toast.success('供应商已删除'); setDeleteSupplier(null); fetchSuppliers(); } catch (e: any) { toast.error(e.message || '删除失败'); }
  }

  function openEditSupplierDialog(s: any) {
    setEditSupplier(s);
    setSupplierForm({ name: s.name || '', contact: s.contact || '', phone: s.phone || '', notes: s.notes || '' });
  }

  // Dict handlers
  async function handleCreateMaterial() {
    try { await dictsApi.createMaterial({ ...materialForm, costPerGram: materialForm.costPerGram ? parseFloat(materialForm.costPerGram) : undefined }); toast.success('材质创建成功'); setShowCreateMaterial(false); setMaterialForm({ name: '', category: '', subType: '', origin: '', costPerGram: '' }); const m = await dictsApi.getMaterials(true); setMaterials(m || []); } catch (e: any) { toast.error(e.message || '创建失败'); }
  }

  async function handleUpdateMaterial() {
    if (!editMaterial) return;
    try { await dictsApi.updateMaterial(editMaterial.id, { ...materialForm, costPerGram: materialForm.costPerGram ? parseFloat(materialForm.costPerGram) : undefined }); toast.success('材质更新成功'); setEditMaterial(null); setMaterialForm({ name: '', category: '', subType: '', origin: '', costPerGram: '' }); const m = await dictsApi.getMaterials(true); setMaterials(m || []); } catch (e: any) { toast.error(e.message || '更新失败'); }
  }

  function openEditMaterialDialog(m: any) {
    setEditMaterial(m);
    setMaterialForm({ name: m.name || '', category: m.category || '', subType: m.subType || '', origin: m.origin || '', costPerGram: m.costPerGram ? String(m.costPerGram) : '' });
  }

  async function handleCreateType() {
    try {
      await dictsApi.createType({ name: typeForm.name, specFields: JSON.stringify(typeForm.specFields) });
      toast.success('器型创建成功');
      setShowCreateType(false);
      setTypeForm({ name: '', specFields: {} });
      const t = await dictsApi.getTypes(true);
      setTypes(t || []);
    } catch (e: any) { toast.error(e.message || '创建失败'); }
  }

  async function handleUpdateType() {
    if (!editType) return;
    try {
      await dictsApi.updateType(editType.id, { name: typeForm.name, specFields: JSON.stringify(typeForm.specFields) });
      toast.success('器型更新成功');
      setEditType(null);
      setTypeForm({ name: '', specFields: {} });
      const t = await dictsApi.getTypes(true);
      setTypes(t || []);
    } catch (e: any) { toast.error(e.message || '更新失败'); }
  }

  async function handleDeleteType() {
    if (!deleteType) return;
    try {
      await dictsApi.deleteType(deleteType.id);
      toast.success('器型已删除/停用');
      setDeleteType(null);
      const t = await dictsApi.getTypes(true);
      setTypes(t || []);
    } catch (e: any) { toast.error(e.message || '删除失败'); }
  }

  function openEditTypeDialog(t: any) {
    setEditType(t);
    setTypeForm({ name: t.name || '', specFields: parseSpecFields(t.specFields) });
  }

  async function handleCreateTag() {
    try { await dictsApi.createTag(tagForm); toast.success('标签创建成功'); setShowCreateTag(false); setTagForm({ name: '', groupName: '' }); const tg = await dictsApi.getTags(undefined, true); setTags(tg || []); } catch (e: any) { toast.error(e.message || '创建失败'); }
  }

  async function handleUpdateTag() {
    if (!editTag) return;
    try { await dictsApi.updateTag(editTag.id, { name: tagForm.name, groupName: tagForm.groupName || null }); toast.success('标签更新成功'); setEditTag(null); setTagForm({ name: '', groupName: '' }); const tg = await dictsApi.getTags(undefined, true); setTags(tg || []); } catch (e: any) { toast.error(e.message || '更新失败'); }
  }

  async function toggleTagActive(id: number, isActive: boolean) {
    try { await dictsApi.updateTag(id, { isActive: !isActive }); setTags(tg => tg.map(x => x.id === id ? { ...x, isActive: !isActive } : x)); toast.success(isActive ? '已停用' : '已启用'); } catch (e: any) { toast.error(e.message); }
  }

  function openEditTagDialog(tag: any) {
    setEditTag(tag);
    setTagForm({ name: tag.name || '', groupName: tag.groupName || '' });
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

  // Import handlers
  function handleFileSelect(file: File) {
    setImportFile(file);
    setImportResult(null);
    // Preview CSV data
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length === 0) return;
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 6).map(line => {
          // Simple CSV split (doesn't handle quoted commas, but good enough for preview)
          return line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        });
        setPreviewData({ headers, rows });
      } catch {
        toast.error('文件预览失败');
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    try {
      const options = { autoCreate, skipExisting };
      const result = importType === 'items'
        ? await importApi.importItems(importFile, options)
        : await importApi.importSales(importFile, { autoCreate });
      setImportResult(result);
      toast.success(`导入完成: 成功${result.successCount}条, 失败${result.failCount}条`);
    } catch (e: any) {
      toast.error(e.message || '导入失败');
    } finally {
      setImporting(false);
    }
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
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dicts">字典管理</TabsTrigger>
          <TabsTrigger value="metal">贵金属市价</TabsTrigger>
          <TabsTrigger value="suppliers">供应商</TabsTrigger>
          <TabsTrigger value="config">系统配置</TabsTrigger>
          <TabsTrigger value="backup">数据备份</TabsTrigger>
          <TabsTrigger value="import">数据导入</TabsTrigger>
        </TabsList>

        <TabsContent value="dicts" className="mt-4 space-y-4">
          {/* Materials */}
          <Card>
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">材质 ({materials.length})</CardTitle><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={() => { setShowCreateMaterial(true); setMaterialForm({ name: '', category: '', subType: '', origin: '', costPerGram: '' }); }}><Plus className="h-3 w-3 mr-1" />新增材质</Button></div></CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>大类</TableHead><TableHead>子类</TableHead><TableHead>产地</TableHead><TableHead className="text-right">克重单价</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {materials.map(m => (
                      <TableRow key={m.id} className={!m.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{m.category || '-'}</TableCell>
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
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">器型 ({types.length})</CardTitle><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={() => { setShowCreateType(true); setTypeForm({ name: '', specFields: {} }); }}><Plus className="h-3 w-3 mr-1" />新增器型</Button></div></CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>规格字段</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {types.map(t => (
                      <TableRow key={t.id} className={!t.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatSpecFieldsDisplay(t.specFields)}</TableCell>
                        <TableCell><Badge variant={t.isActive ? 'default' : 'secondary'} className={t.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : ''}>{t.isActive ? '启用' : '停用'}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600" onClick={() => openEditTypeDialog(t)} title="编辑"><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => {
                              try { await dictsApi.deleteType(t.id); toast.success('器型已删除/停用'); const tp = await dictsApi.getTypes(true); setTypes(tp || []); } catch (e: any) { toast.error(e.message); }
                            }}>{t.isActive ? '停用' : '启用'}</Button>
                          </div>
                        </TableCell>
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
              {/* Group filter */}
              {Object.keys(tagGroups).length > 1 && (
                <div className="mb-3">
                  <Select value={tagGroupFilter} onValueChange={v => setTagGroupFilter(v === '_all' ? '' : v)}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="全部分组" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">全部分组</SelectItem>
                      {Object.keys(tagGroups).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-3">
                {Object.entries(tagGroups)
                  .filter(([group]) => !tagGroupFilter || group === tagGroupFilter)
                  .map(([group, groupTags]: [string, any]) => (
                  <div key={group}>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {groupTags.map((tag: any) => (
                        <div key={tag.id} className="group relative">
                          <Badge
                            variant={tag.isActive ? 'default' : 'secondary'}
                            className={`${tag.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'opacity-50'} cursor-pointer pr-6`}
                            onClick={() => openEditTagDialog(tag)}
                            title="点击编辑"
                          >
                            {tag.name}
                          </Badge>
                          <Button
                            size="sm" variant="ghost"
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); toggleTagActive(tag.id, tag.isActive); }}
                            title={tag.isActive ? '停用' : '启用'}
                          >
                            {tag.isActive ? <span className="text-[10px]">✕</span> : <span className="text-[10px]">✓</span>}
                          </Button>
                        </div>
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
                      {s.phone && (
                        <a href={`tel:${s.phone}`} className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 transition-colors">
                          <Phone className="h-3 w-3" />{s.phone}
                        </a>
                      )}
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
                {/* Warning days config */}
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="font-medium">压货预警天数</p>
                      <p className="text-xs text-muted-foreground">超过此天数未售出的货品将列入压货预警（看板页面使用）</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={configs.find(c => c.key === 'warning_days')?.value || '90'} className="w-20 h-8 text-sm text-center"
                      onBlur={e => {
                        const val = e.target.value;
                        if (val && parseInt(val) > 0) {
                          updateConfig('warning_days', val);
                        }
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                    <span className="text-sm text-muted-foreground">天</span>
                  </div>
                </div>
                {/* Other configs */}
                {configs.filter(c => c.key !== 'warning_days').map(c => (
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

        <TabsContent value="backup" className="mt-4 space-y-4">
          {/* Download backup */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4 text-emerald-600" />备份数据库</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">下载当前数据库文件（SQLite），可用于数据迁移或定期备份。</p>
              <div className="flex items-center gap-4">
                <Button className="bg-emerald-600 hover:bg-emerald-700" asChild onClick={() => setLastBackupTime(new Date().toLocaleString('zh-CN'))}>
                  <a href={backupApi.download()} download>
                    <Download className="h-4 w-4 mr-2" />下载数据库备份
                  </a>
                </Button>
                {lastBackupTime && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />上次备份: {lastBackupTime}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Restore backup */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4 text-amber-600" />恢复数据库</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">从备份文件恢复数据库。恢复前会自动保存当前数据库为安全副本。</p>
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 mb-4">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">⚠️ 恢复操作将覆盖当前所有数据，请谨慎操作！</p>
              </div>
              <div className="flex items-center gap-3">
                <Input type="file" accept=".db" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setRestoreFile(f); setShowRestoreConfirm(true); }
                }} className="max-w-xs" />
                {restoring && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
              </div>
            </CardContent>
          </Card>

          {/* Info card */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-sky-600" />数据说明</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• 数据库为 SQLite 单文件，包含所有业务数据（货品、销售、客户等）</p>
                <p>• 图片文件需单独备份（<code className="px-1 py-0.5 bg-muted rounded text-xs">public/images/</code> 目录）</p>
                <p>• Docker 部署时，数据和图片已挂载到本地 <code className="px-1 py-0.5 bg-muted rounded text-xs">./data/</code> 目录</p>
                <p>• 建议定期下载备份，特别是进行大批量操作前</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="import" className="mt-4 space-y-4">
          {/* Import type selector */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-emerald-600" />数据批量导入</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">上传CSV文件批量导入库存或销售数据。支持自动创建缺失的材质/器型/标签。</p>
              <div className="flex items-center gap-4 mb-4">
                <Label className="text-sm font-medium">导入类型</Label>
                <Select value={importType} onValueChange={(v: 'items' | 'sales') => { setImportType(v); setImportFile(null); setImportResult(null); setPreviewData(null); }}>
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="items">库存数据</SelectItem>
                    <SelectItem value="sales">销售数据</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-9 text-xs" asChild>
                  <a href={importApi.downloadTemplate(importType)} download>
                    <FileDown className="h-3.5 w-3.5 mr-1" />下载模板
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File upload area */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">选择文件</CardTitle></CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('import-file-input')?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const f = e.dataTransfer.files[0];
                  if (f && (f.name.endsWith('.csv') || f.name.endsWith('.txt'))) {
                    handleFileSelect(f);
                  } else {
                    toast.error('请上传CSV文件');
                  }
                }}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">点击或拖拽CSV文件到此处上传</p>
                <p className="text-xs text-muted-foreground">支持 .csv 格式（UTF-8编码）</p>
                <input
                  id="import-file-input"
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </div>
              {importFile && (
                <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">{importFile.name}</span>
                    <span className="text-xs text-muted-foreground">({(importFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => { setImportFile(null); setPreviewData(null); }}>×</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data preview */}
          {previewData && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">数据预览（前5行）</CardTitle></CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        {previewData.headers.map((h, i) => (
                          <TableHead key={i} className="text-xs whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.rows.map((row, ri) => (
                        <TableRow key={ri}>
                          <TableCell className="text-xs text-center text-muted-foreground">{ri + 1}</TableCell>
                          {row.map((cell, ci) => (
                            <TableCell key={ci} className="text-xs whitespace-nowrap max-w-32 truncate">{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">导入选项</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={autoCreate}
                    onCheckedChange={(checked) => setAutoCreate(!!checked)}
                  />
                  <div>
                    <p className="text-sm font-medium">自动创建缺失的材质/器型/标签</p>
                    <p className="text-xs text-muted-foreground">关闭后，遇到不存在的材质或器型时将跳过该行</p>
                  </div>
                </label>
                {importType === 'items' && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={skipExisting}
                      onCheckedChange={(checked) => setSkipExisting(!!checked)}
                    />
                    <div>
                      <p className="text-sm font-medium">SKU已存在时跳过</p>
                      <p className="text-xs text-muted-foreground">关闭后，遇到已存在的SKU将更新该货品信息</p>
                    </div>
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Import button */}
          <div className="flex items-center gap-3">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!importFile || importing}
              onClick={handleImport}
            >
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {importing ? '正在导入...' : '开始导入'}
            </Button>
            {importFile && !importing && (
              <p className="text-sm text-muted-foreground">
                即将导入 <span className="font-medium text-foreground">{importType === 'items' ? '库存' : '销售'}</span> 数据
              </p>
            )}
          </div>

          {/* Import result */}
          {importResult && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">导入结果</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">成功: {importResult.successCount}条</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">失败: {importResult.failCount}条</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">总计: {importResult.total}条</span>
                  </div>
                </div>
                {importResult.results && importResult.results.filter((r: any) => !r.success).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 text-red-600">失败详情：</p>
                    <div className="max-h-64 overflow-y-auto border rounded-lg custom-scrollbar">
                      <Table>
                        <TableHeader><TableRow><TableHead className="w-14">行号</TableHead><TableHead>SKU</TableHead><TableHead>名称</TableHead><TableHead>失败原因</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {importResult.results.filter((r: any) => !r.success).map((r: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs text-center">{r.row}</TableCell>
                              <TableCell className="text-xs font-mono">{r.skuCode || '-'}</TableCell>
                              <TableCell className="text-xs">{r.name || '-'}</TableCell>
                              <TableCell className="text-xs text-red-600">{r.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() => {
                        const failed = importResult.results.filter((r: any) => !r.success);
                        const csv = ['行号,SKU,名称,失败原因', ...failed.map((r: any) => `${r.row},${r.skuCode || ''},${r.name || ''},${r.error || ''}`)].join('\n');
                        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `导入失败记录_${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />下载失败记录
                    </Button>
                  </div>
                )}
                {importResult.results && importResult.results.filter((r: any) => r.success).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                      查看成功记录（{importResult.results.filter((r: any) => r.success).length}条）
                    </summary>
                    <div className="max-h-48 overflow-y-auto border rounded-lg mt-2 custom-scrollbar">
                      <Table>
                        <TableHeader><TableRow><TableHead className="w-14">行号</TableHead><TableHead>SKU</TableHead><TableHead>名称</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {importResult.results.filter((r: any) => r.success).map((r: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs text-center">{r.row}</TableCell>
                              <TableCell className="text-xs font-mono">{r.skuCode || '-'}</TableCell>
                              <TableCell className="text-xs">{r.name || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help card */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-sky-600" />导入说明</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• 请先下载模板，按模板格式填写数据后再上传</p>
                <p>• CSV文件需使用 <code className="px-1 py-0.5 bg-muted rounded text-xs">UTF-8</code> 编码，Excel另存为CSV时选择"CSV UTF-8"</p>
                <p>• <b>库存导入</b>必填字段：材质、售价；其他字段可选</p>
                <p>• <b>销售导入</b>必填字段：SKU编号、成交价；销售日期默认为今天</p>
                <p>• 开启"自动创建"后，系统会自动创建CSV中提到但字典中不存在的材质、器型、标签</p>
                <p>• 标签字段支持多个标签，用逗号或顿号分隔（如：限定款,热门）</p>
                <p>• 建议先少量测试导入，确认无误后再大批量导入</p>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>联系人</Label><Input value={supplierForm.contact} onChange={e => setSupplierForm(f => ({ ...f, contact: e.target.value }))} placeholder="联系人姓名" /></div>
              <div className="space-y-1"><Label><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />电话</span></Label><Input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} placeholder="手机号码" /></div>
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>联系人</Label><Input value={supplierForm.contact} onChange={e => setSupplierForm(f => ({ ...f, contact: e.target.value }))} /></div>
              <div className="space-y-1"><Label><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />电话</span></Label><Input value={supplierForm.phone} onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
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
            <div className="space-y-1"><Label>大类</Label>
              <Select value={materialForm.category} onValueChange={v => setMaterialForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="选择大类" /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-1"><Label>大类</Label>
              <Select value={materialForm.category} onValueChange={v => setMaterialForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="选择大类" /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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

      {/* Create Type Dialog - Checkbox style */}
      <Dialog open={showCreateType} onOpenChange={setShowCreateType}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增器型</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="如: 手镯" /></div>
            <div className="space-y-2">
              <Label>规格字段</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {SPEC_FIELD_OPTIONS.map(field => {
                  const isChecked = field.key in typeForm.specFields;
                  const isRequired = typeForm.specFields[field.key]?.required ?? false;
                  return (
                    <div key={field.key} className="flex items-center gap-3">
                      <Checkbox
                        id={`spec-${field.key}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setTypeForm(f => {
                            const newFields = { ...f.specFields };
                            if (checked) {
                              newFields[field.key] = { required: false };
                            } else {
                              delete newFields[field.key];
                            }
                            return { ...f, specFields: newFields };
                          });
                        }}
                      />
                      <Label htmlFor={`spec-${field.key}`} className="text-sm flex-1 cursor-pointer">{field.label}</Label>
                      {isChecked && (
                        <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={isRequired}
                            onCheckedChange={(checked) => {
                              setTypeForm(f => ({
                                ...f,
                                specFields: {
                                  ...f.specFields,
                                  [field.key]: { required: !!checked },
                                },
                              }));
                            }}
                          />
                          必填
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">勾选需要的规格字段，并标记是否必填</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateType(false)}>取消</Button>
            <Button onClick={handleCreateType} className="bg-emerald-600 hover:bg-emerald-700" disabled={!typeForm.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Type Dialog */}
      <Dialog open={editType !== null} onOpenChange={open => { if (!open) setEditType(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑器型</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="如: 手镯" /></div>
            <div className="space-y-2">
              <Label>规格字段</Label>
              <div className="space-y-2 border rounded-lg p-3">
                {SPEC_FIELD_OPTIONS.map(field => {
                  const isChecked = field.key in typeForm.specFields;
                  const isRequired = typeForm.specFields[field.key]?.required ?? false;
                  return (
                    <div key={field.key} className="flex items-center gap-3">
                      <Checkbox
                        id={`edit-spec-${field.key}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setTypeForm(f => {
                            const newFields = { ...f.specFields };
                            if (checked) {
                              newFields[field.key] = { required: false };
                            } else {
                              delete newFields[field.key];
                            }
                            return { ...f, specFields: newFields };
                          });
                        }}
                      />
                      <Label htmlFor={`edit-spec-${field.key}`} className="text-sm flex-1 cursor-pointer">{field.label}</Label>
                      {isChecked && (
                        <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={isRequired}
                            onCheckedChange={(checked) => {
                              setTypeForm(f => ({
                                ...f,
                                specFields: {
                                  ...f.specFields,
                                  [field.key]: { required: !!checked },
                                },
                              }));
                            }}
                          />
                          必填
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">勾选需要的规格字段，并标记是否必填</p>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span className="text-sm">状态</span>
              <Button size="sm" variant={editType?.isActive ? 'outline' : 'default'} className={editType?.isActive ? 'text-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'} onClick={async () => {
                if (!editType) return;
                try { await dictsApi.deleteType(editType.id); toast.success(editType.isActive ? '已停用' : '已启用'); const tp = await dictsApi.getTypes(true); setTypes(tp || []); setEditType(null); } catch (e: any) { toast.error(e.message); }
              }}>{editType?.isActive ? '停用' : '启用'}</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditType(null)}>取消</Button>
            <Button onClick={handleUpdateType} className="bg-emerald-600 hover:bg-emerald-700" disabled={!typeForm.name}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Type Confirm Dialog */}
      <Dialog open={deleteType !== null} onOpenChange={open => { if (!open) setDeleteType(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle><DialogDescription>确定要删除器型「{deleteType?.name}」吗？此操作不可恢复。</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteType(null)}>取消</Button>
            <Button onClick={handleDeleteType} className="bg-red-600 hover:bg-red-700">确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={showCreateTag} onOpenChange={setShowCreateTag}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增标签</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={tagForm.name} onChange={e => setTagForm(f => ({ ...f, name: e.target.value }))} placeholder="如: 限定款" /></div>
            <div className="space-y-1"><Label>分组</Label>
              {Object.keys(tagGroups).filter(g => g !== '未分组').length > 0 ? (
                <div className="flex gap-2">
                  <Select value={tagForm.groupName} onValueChange={v => setTagForm(f => ({ ...f, groupName: v === '_custom' ? '' : v }))}>
                    <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="选择分组" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_custom">自定义...</SelectItem>
                      {Object.keys(tagGroups).filter(g => g !== '未分组').map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(!tagForm.groupName || !Object.keys(tagGroups).includes(tagForm.groupName)) && (
                    <Input value={tagForm.groupName} onChange={e => setTagForm(f => ({ ...f, groupName: e.target.value }))} placeholder="如: 风格" className="flex-1" />
                  )}
                </div>
              ) : (
                <Input value={tagForm.groupName} onChange={e => setTagForm(f => ({ ...f, groupName: e.target.value }))} placeholder="如: 风格" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTag(false)}>取消</Button>
            <Button onClick={handleCreateTag} className="bg-emerald-600 hover:bg-emerald-700" disabled={!tagForm.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={editTag !== null} onOpenChange={open => { if (!open) setEditTag(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑标签</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>名称 *</Label><Input value={tagForm.name} onChange={e => setTagForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>分组</Label>
              {Object.keys(tagGroups).filter(g => g !== '未分组').length > 0 ? (
                <div className="flex gap-2">
                  <Select value={tagForm.groupName} onValueChange={v => setTagForm(f => ({ ...f, groupName: v === '_custom' ? '' : v }))}>
                    <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="选择分组" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_custom">自定义...</SelectItem>
                      {Object.keys(tagGroups).filter(g => g !== '未分组').map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(!tagForm.groupName || !Object.keys(tagGroups).includes(tagForm.groupName)) && (
                    <Input value={tagForm.groupName} onChange={e => setTagForm(f => ({ ...f, groupName: e.target.value }))} placeholder="如: 风格" className="flex-1" />
                  )}
                </div>
              ) : (
                <Input value={tagForm.groupName} onChange={e => setTagForm(f => ({ ...f, groupName: e.target.value }))} />
              )}
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span className="text-sm">状态</span>
              <Button size="sm" variant={editTag?.isActive ? 'outline' : 'default'} className={editTag?.isActive ? 'text-orange-600' : 'bg-emerald-600 hover:bg-emerald-700'} onClick={() => { if (editTag) toggleTagActive(editTag.id, editTag.isActive); }}>{editTag?.isActive ? '停用' : '启用'}</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTag(null)}>取消</Button>
            <Button onClick={handleUpdateTag} className="bg-emerald-600 hover:bg-emerald-700" disabled={!tagForm.name}>保存修改</Button>
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

      {/* Restore Confirm Dialog */}
      <Dialog open={showRestoreConfirm} onOpenChange={open => { if (!open) { setShowRestoreConfirm(false); setRestoreFile(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认恢复数据库</DialogTitle><DialogDescription>即将用文件「{restoreFile?.name}」覆盖当前数据库。恢复前会自动保存当前数据库为安全副本。</DialogDescription></DialogHeader>
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">⚠️ 此操作将覆盖当前所有数据！恢复后需要刷新页面。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRestoreConfirm(false); setRestoreFile(null); }}>取消</Button>
            <Button onClick={async () => {
              if (!restoreFile) return;
              setRestoring(true);
              try {
                await backupApi.restore(restoreFile);
                toast.success('数据库恢复成功，页面将在3秒后刷新');
                setShowRestoreConfirm(false);
                setRestoreFile(null);
                setTimeout(() => window.location.reload(), 3000);
              } catch (e: any) {
                toast.error(e.message || '恢复失败');
              } finally {
                setRestoring(false);
              }
            }} className="bg-red-600 hover:bg-red-700" disabled={restoring}>
              {restoring && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              确认恢复
            </Button>
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
export { SPEC_FIELD_LABEL_MAP, MATERIAL_CATEGORIES, parseSpecFields, formatSpecFieldsDisplay };
