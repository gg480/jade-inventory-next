# 玉器店进销存系统 - 项目工作日志

## 项目当前状态描述/判断

### 迁移完成状态：100%
- **技术栈**: Next.js 16 + React + Prisma(SQLite) + Tailwind CSS + shadcn/ui + recharts
- **代码规模**: page.tsx ~57行(薄调度器)，17个Prisma表，60+API端点，18个组件文件
- **测试数据**: 34个货品(10个关联批次) + 6个批次 + 8条销售记录 + 5个客户
- **核心功能**: 全部完成（双轨入库/出库/退货/编辑/套装销售/成本分摊/回本看板/操作日志/销售退货）
- **批次关联**: 完整（批次→货品FK关联/库存显示所属批次/批次显示已录入数/批次筛选/录入进度）
- **UI质量**: 高（暗色模式/移动端响应式/过渡动画/图标装饰/卡片视图/VIP徽章/快速统计底栏/InfoTip提示）
- **稳定性**: 高（lint通过/所有API正常/agent-browser全7页面QA零错误）
- **与原项目功能对齐**: 已完成原始Python+Vue项目功能全面对比，所有核心功能均已实现

### 已完成工作总览
- ✅ Prisma schema 17张表（含 SaleReturn + OperationLog）
- ✅ 全部 API 路由（dashboard/dicts/items/sales/batches/customers/suppliers/metal-prices/config/export/pricing/items-lookup/items-images/sales-return/logs）
- ✅ 前端 API 客户端 (api.ts) - 含 pricingApi, lookupBySku, uploadImage 等
- ✅ Zustand 状态管理 (store.ts)
- ✅ 种子数据脚本 (seed.ts)
- ✅ Dashboard 看板页（增强版概览卡片+16个recharts图表+时段筛选器+压货预警+库龄分布）
- ✅ 库存列表页（筛选+批次筛选+表格+所属批次列+扫码出库+销售出库弹窗+删除+编辑+退货+标签打印+移动端卡片视图）
- ✅ 销售记录页（筛选+表格+分页+套装销售+**销售退货**+**利润趋势迷你图**+**汇总行**）
- ✅ 批次列表页（统计+表格+已录入列+待录入卡片+已关联标签+分摊按钮+创建弹窗+批次详情弹窗）
- ✅ 客户管理页（搜索+卡片+创建弹窗+编辑弹窗+展开详情+购买历史+**VIP等级徽章**+**统计概览卡片**）
- ✅ 系统设置页（字典管理4Tab+新增/编辑材质+新增器型/标签+贵金属市价+批量调价预览/确认+市价历史+供应商CRUD+系统配置）
- ✅ 货品编辑对话框（ItemEditDialog）
- ✅ 货品详情对话框（ItemDetailDialog - 含图片上传/删除/设封面）
- ✅ 标签打印对话框（LabelPrintDialog - 打印SKU条码标签）
- ✅ 定价引擎（pricingApi - 输入成本自动计算建议售价/底价/毛利率）
- ✅ 扫码销售（库存页顶部扫码输入 - 输入SKU快速出库）
- ✅ 预估成本显示（未分摊的通货货品显示预估成本=批次总价/数量）
- ✅ 货品图片管理（上传/删除/设封面/封面标识）
- ✅ 移动端底部导航栏
- ✅ 暗色模式切换（light/dark/system）
- ✅ 页面Tab切换过渡动画（fadeIn）
- ✅ **操作日志系统**（记录入库/出库/退货/编辑/删除等所有操作）
- ✅ **销售退货API**（创建退货记录+恢复货品状态）
- ✅ **库存排序**（按价格/库龄/SKU/名称/创建时间正序/倒序）
- ✅ **VIP客户等级**（4级：普通/银卡/金卡/钻石）
- ✅ **快速统计底栏**（库存数/今日销售数/今日营收）
- ✅ **UI精细化**（卡片悬停发光/表格行过渡/空状态优化）

---

## 当前目标/已完成的修改/验证结果

### 阶段1-5: 全部完成 ✅

---

## Task 6: 原项目功能对比 + 缺失功能补充 (2026-04-14)

### 完成的修改

#### 1. 原项目功能全面对比
对照原始项目（Python Flask + Vue.js）的功能清单，逐一核对当前Next.js项目：
- ✅ 字典管理 CRUD（材质/器型/标签新建+编辑+启用/停用）
- ✅ 批次管理（创建/分摊/3种算法）
- ✅ 双轨入库（高货单步入库+通货关联批次入库）
- ✅ 库存查看（多维筛选+分页+移动端卡片视图）
- ✅ 销售出库（单件+套装）
- ✅ 贵金属市价（手动更新+批量调价预览/确认+历史记录）
- ✅ 批次回本看板
- ✅ 利润看板（16个图表）
- ✅ 压货预警（可配置阈值天数）
- ✅ 客户管理（创建+编辑+详情+购买历史）
- ✅ 供应商CRUD（创建+编辑+删除）
- ✅ 数据导出（Excel）
- ✅ 定价引擎/利润测算
- ✅ 扫码销售
- ✅ 货品图片管理
- ✅ 标签打印
- ❌ 登录认证（单用户NAS场景优先级低，待后续实现）

#### 2. 新增后端API
- `POST /api/pricing` — 定价引擎，根据成本价/材质/器型/克重计算建议售价
- `GET /api/items/lookup?sku=xxx` — SKU条码查询，支持扫码销售
- `POST /api/items/[id]/images` — 图片上传（multipart/form-data）
- `DELETE /api/items/[id]/images?image_id=xxx` — 图片删除
- `PUT /api/items/[id]/images` — 设置封面图片

#### 3. 预估成本显示
**问题**: 未分摊成本的通货货品在库存列表中成本显示为¥0.00
**修复**:
- `items/route.ts` (GET列表): batch查询增加totalCost和quantity字段，计算`estimatedCost = totalCost / quantity`
- 前端库存表格: 有分摊成本显示分摊成本，无分摊成本有预估成本显示"¥xxx~"(灰色+波浪号)，都没有显示costPrice

#### 4. 标签打印功能
新增`LabelPrintDialog`组件:
- 显示SKU条码标签预览（SKU编号+条码+材质/器型/规格+售价）
- 点击打印按钮弹出打印窗口，支持直接打印
- 在库存表格和移动端卡片中添加"标签"按钮

#### 5. API客户端更新
`api.ts`新增:
- `itemsApi.lookupBySku(sku)` — SKU查询
- `itemsApi.uploadImage(itemId, file)` — 图片上传
- `itemsApi.deleteImage(itemId, imageId)` — 图片删除
- `itemsApi.setCoverImage(itemId, imageId)` — 设封面
- `pricingApi.calculate(data)` — 定价计算

### 验证结果
- ✅ ESLint lint 通过（0 errors, 0 warnings）
- ✅ Dev server 运行正常
- ✅ 定价引擎API测试通过（costPrice=5000 → suggestedPrice=6500, markup=1.3）
- ✅ SKU查询API测试通过（存在返回数据，不存在返回404）
- ✅ Items API返回estimatedCost字段
- ✅ 所有页面正常渲染

### 未解决/待改进
- 登录认证系统（JWT + 密码修改，单用户NAS场景优先级低）
- ✅ 页面组件拆分（page.tsx 已拆分为16个独立组件文件）
- 图片缩略图生成（当前仅保存原图）
- 批量操作（批量删除/批量修改状态）
- 数据统计导出为Excel功能完善
- 同比环比数据对比图表
- ✅ Docker配置和GitHub推送（已完成，见下方Task 8）
- 操作日志前端展示页面（API已就绪，前端Tab待添加）
- 数据备份/恢复API端点

---
Task ID: 2
Agent: component-splitter
Task: Split page.tsx into separate component files

Work Log:
- Created /home/z/my-project/src/components/inventory/ directory
- Extracted 16 component files from page.tsx (3232 lines monolith)
  - shared.tsx (78 lines) - formatPrice, StatusBadge, PaybackBar, EmptyState, LoadingSkeleton, CHART_COLORS, fadeInStyle
  - theme-toggle.tsx (44 lines) - ThemeToggle, useMounted
  - dashboard-tab.tsx (609 lines) - DashboardTab with 16 recharts charts
  - item-create-dialog.tsx (306 lines) - ItemCreateDialog (dual-mode: high_value/batch)
  - item-detail-dialog.tsx (244 lines) - ItemDetailDialog with image management
  - item-edit-dialog.tsx (188 lines) - ItemEditDialog with dynamic spec fields
  - batch-detail-dialog.tsx (150 lines) - BatchDetailDialog
  - batch-create-dialog.tsx (115 lines) - BatchCreateDialog
  - bundle-sale-dialog.tsx (160 lines) - BundleSaleDialog with chain support
  - label-print-dialog.tsx (69 lines) - LabelPrintDialog with barcode
  - inventory-tab.tsx (363 lines) - InventoryTab with scan-to-sell
  - sales-tab.tsx (161 lines) - SalesTab with bundle sale
  - batches-tab.tsx (147 lines) - BatchesTab with allocate
  - customers-tab.tsx (210 lines) - CustomersTab with expandable cards
  - settings-tab.tsx (487 lines) - SettingsTab with 4 sub-tabs
  - navigation.tsx (85 lines) - MobileNav + DesktopNav
- Rewrote page.tsx as thin orchestrator (57 lines)
- Fixed ESLint warning (void fadeInStyle instead of bare expression)
- Verified lint passes (0 errors, 0 warnings)
- Browser QA passed: all 6 tabs render correctly
  - Dashboard: overview cards, batch payback table, charts loaded
  - 库存管理: scan-to-sell bar, stats, filters, table
  - 销售记录: stats cards, filters, sales table
  - 批次管理: batch stats, batch table with payback bars
  - 客户管理: customer cards with expand
  - 系统设置: 4 sub-tabs (字典管理/贵金属市价/供应商/系统配置)
  - Zero console errors
  - Tab switching animation works

Stage Summary:
- page.tsx reduced from 3232 lines to 57 lines (98.2% reduction)
- 16 component files created under src/components/inventory/
- Total component code: 3416 lines across 16 files
- All functionality preserved, no regressions detected
- Lint: 0 errors, 0 warnings

---
Task ID: 7
Agent: cron-agent
Task: Feature enhancements - sales return, operation logs, sorting, VIP, UI polish

Work Log:

### Feature 1: Sales Return API
- Added `SaleReturn` model to Prisma schema (id, sale_id FK, item_id FK, refund_amount, return_reason, return_date, created_at)
- Added reverse relations to `SaleRecord` and `Item` models
- Ran `prisma db push` to apply schema changes (17 tables total now)
- Created `POST /api/sales/return/route.ts` — validates sale exists, item status is 'sold', creates return record, changes item status to 'returned', logs action

### Feature 2: Operation Log System
- Added `OperationLog` model to Prisma schema (id, action, target_type, target_id, detail, operator, created_at) with indexes
- Created `/home/z/my-project/src/lib/log.ts` — `logAction(action, targetType, targetId, detail)` helper function (fire-and-forget, errors silently ignored)
- Created `GET /api/logs/route.ts` — list logs with pagination, filters (action, target_type, date range)
- Integrated logging into existing APIs:
  - `POST /api/items` → logAction('create_item')
  - `PUT /api/items/[id]` → logAction('edit_item') with field diff
  - `DELETE /api/items/[id]` → logAction('delete_item')
  - `POST /api/sales` → logAction('sell_item')
  - `POST /api/sales/return` → logAction('return_sale')
  - `POST /api/batches/[id]/allocate` → logAction('allocate_batch')

### Feature 3: Inventory Sorting
- Updated `GET /api/items` to accept `sort_by` (created_at, selling_price, cost_price, purchase_date, sku_code, name) and `sort_order` (asc/desc)
- Updated `inventory-tab.tsx` with sort controls: dropdown for sort field + toggle button for asc/desc

### Feature 4: Customer VIP Level & Statistics
- Added `getVipLevel(totalSpending)` helper function with 4 tiers:
  - 普通客户 (< ¥5000) — gray Shield icon
  - 银卡会员 (¥5000-19999) — slate ShieldCheck icon
  - 金卡会员 (¥20000-49999) — amber Crown icon
  - 钻石会员 (>= ¥50000) — violet Sparkles icon
- Updated `GET /api/customers` to aggregate total spending per customer via saleRecord groupBy
- Added stats overview in customers API response (totalCustomers, newThisMonth, totalSpending, avgOrderValue)
- Updated `customers-tab.tsx` with 4 stats cards at top, VIP badges with gradient colors on each customer card, total spending and order count display

### Feature 5: Sales Page Enhancements
- Added "退货" button on each sales record row in `sales-tab.tsx`
- Added return confirmation dialog with: refund amount (pre-filled), return reason textarea, return date picker
- Calls `POST /api/sales/return` endpoint
- Added profit trend sparkline chart (recharts AreaChart) showing monthly revenue trend
- Added summary row at bottom of table showing totals (revenue + profit)

### Feature 6: UI Polish
- Enhanced EmptyState component: rounded icon container, improved padding and description text
- Added card glow animation (`card-glow` class + `glowPulse` keyframe) in shared.tsx CSS
- Added hover:border color transitions on stat cards across all tabs
- Added hover:bg-muted/50 transitions on table rows
- Enhanced footer with "快速统计" (Quick Stats) bar showing: inventory count, today's sales count, today's revenue
- Updated `api.ts` with new functions: `salesApi.returnSale()`, `logsApi.getLogs()`

### Bug Fixes
- Fixed TypeScript error in batches/allocate route: typed `results` as `any[]` instead of inferred `never[]`

Stage Summary:
- 2 new Prisma models (SaleReturn, OperationLog) — 17 tables total
- 2 new API routes (POST /api/sales/return, GET /api/logs)
- 6 existing API routes updated with operation logging
- 4 new frontend features (sorting, VIP, sales return dialog, sparkline)
- Quick Stats footer added to page.tsx
- ESLint: 0 errors, 0 warnings
- Dev server verified: all APIs responding correctly

---
Task ID: 8
Agent: main
Task: GitHub推送 + Docker部署配置

Work Log:
- 验证 GitHub token 有效，用户 gg480
- 原仓库 gg480/jade-inventory 已存在（Python+Vue版），创建新仓库 gg480/jade-inventory-next
- 推送全部代码到 GitHub: https://github.com/gg480/jade-inventory-next
- 创建 Dockerfile（多阶段构建: node:20-alpine, standalone output, prisma db push on startup）
- 创建 docker-compose.yml（持久化: ./data/db → /app/db, ./data/images → /app/public/images）
- 创建 .dockerignore（排除 node_modules/.next/db/截图等）
- 创建 DEPLOY.md 部署文档（快速部署/数据持久化/NAS部署/备份恢复/故障排查）
- 推送 Docker 配置到 GitHub (commit 80523aa)

Stage Summary:
- GitHub仓库: https://github.com/gg480/jade-inventory-next (main分支)
- Docker配置完成: Dockerfile + docker-compose.yml + .dockerignore + DEPLOY.md
- 持久化方案: 数据库(db/custom.db) + 图片(public/images/) 均映射到本地 ./data/ 目录
- 部署端口: 主机8080 → 容器3000

---
Task ID: 1
Agent: schema-upgrade
Task: Schema升级 + 材质级联下拉 + 器型必填参数 + 柜台号必填 + 字段中文化

Work Log:

### 1. Prisma Schema 升级
- DictMaterial 新增 `category String? @map("category")` 字段，用于材质大类分类（玉/贵金属/水晶/文玩/其他）
- DictType 的 specFields 格式升级：从简单数组 `["weight","braceletSize"]` → 对象格式 `{"weight":{"required":false},"braceletSize":{"required":true}}`
- 运行 `bun run db:push` 成功同步数据库

### 2. 材质 API 更新
- `POST /api/dicts/materials` — 新增 category 参数支持
- `PUT /api/dicts/materials/[id]` — 已支持 category（直接传 body 更新）
- `POST /api/dicts/types` — specFields 直接存储 JSON 字符串（无需修改）

### 3. settings-tab.tsx 重构
- 材质创建/编辑对话框：新增"大类"下拉选择（玉/贵金属/水晶/文玩/其他）
- 材质列表表格：新增"大类"列
- 器型创建对话框：从文本输入改为勾选式 UI
  - 7个可选规格字段（克重/金重/尺寸/圈口/颗数/珠径/戒圈），中文标签
  - 每个勾选的字段旁加"必填"复选框
  - 提交时生成 `{"fieldKey": {"required": true/false}}` 格式的 JSON
- 器型列表显示：specFields 列显示中文名，必填字段标记红色*
- 导出辅助函数：`SPEC_FIELD_LABEL_MAP`, `MATERIAL_CATEGORIES`, `parseSpecFields`, `formatSpecFieldsDisplay`

### 4. 材质级联下拉
- item-create-dialog.tsx（高货入库模式）：
  - 第一级：材质大类下拉
  - 第二级：根据大类筛选后的材质下拉
  - 切换大类时自动清空已选材质
- inventory-tab.tsx 筛选区域：
  - 新增"材质大类"筛选项
  - "材质"筛选项根据大类级联过滤
  - 筛选栏从5列扩展为6列适配

### 5. 器型必填参数
- 创建/编辑对话框中，根据器型的 specFields 配置自动标记必填字段（红色*）
- 保存时校验必填规格字段，未填写 toast 提示"请输入{中文名}"
- 预设器型 specFields 配置（已更新种子数据）：
  - 手镯: braceletSize 必填
  - 戒指: ringSize 必填
  - 手串/手链: beadDiameter 必填
  - 项链: beadDiameter 必填

### 6. 柜台号必填
- item-create-dialog.tsx：柜台号字段标记红色*，保存时校验
- item-edit-dialog.tsx：柜台号字段标记红色*，保存时校验
- 保存时如果柜台号为空，toast 提示"请输入柜台号"

### 7. 字段中文化
- specFields 输入从英文提示改为中文标签显示
- 规格字段映射：weight→克重(g), metalWeight→金重(g), size→尺寸, braceletSize→圈口, beadCount→颗数, beadDiameter→珠径, ringSize→戒圈
- parseSpecFields 函数向后兼容旧数组格式数据

### 8. 种子数据更新
- 所有36种材质添加 category 大类分类
- 9种器型 specFields 升级为对象格式（含 required 标记）
- 运行 `npx tsx prisma/seed.ts` 更新已有数据

### 验证结果
- ✅ ESLint lint 通过（0 errors, 0 warnings）
- ✅ Dev server 运行正常
- ✅ 数据库同步成功（prisma db push）
- ✅ 种子数据更新成功（材质大类 + 器型新格式）

### 关键文件变更
- `prisma/schema.prisma` — DictMaterial 新增 category 字段
- `prisma/seed.ts` — 材质大类 + 器型新 specFields 格式
- `src/app/api/dicts/materials/route.ts` — POST 支持 category
- `src/components/inventory/settings-tab.tsx` — 全面重构（大类/勾选式器型/中文标签/导出辅助函数）
- `src/components/inventory/item-create-dialog.tsx` — 级联下拉/必填校验/中文化
- `src/components/inventory/item-edit-dialog.tsx` — 必填校验/中文化
- `src/components/inventory/inventory-tab.tsx` — 级联筛选

---
Task ID: 2
Agent: feature-enhancer
Task: 标签分类优化 + 手机端摄像头扫码出库

### 任务1: 标签分类优化

#### 1.1 入库/编辑弹窗标签按分组展示
- `item-create-dialog.tsx` — 高货入库和通货入库两个模式的标签区域均改为按 groupName 分组展示
  - 使用 IIFE 在 JSX 中计算 tagGroups（从 tags 数组 reduce 为 { groupName: [tags] } 对象）
  - 只有"未分组"一组时不显示分组标题
  - 多分组时每个分组显示小标题（如"风格"、"材质"），下面是勾选框
- `item-edit-dialog.tsx` — 同样改为按 groupName 分组展示标签

#### 1.2 设置页标签管理增强
- `settings-tab.tsx` 新增功能：
  - **分组筛选下拉**: 当标签存在多个分组时，顶部显示分组筛选 Select 组件，支持按分组筛选标签显示
  - **标签编辑**: 点击标签 Badge 弹出编辑对话框，可编辑名称和分组（分组支持从已有分组下拉选择或自定义输入）
  - **标签停用/启用**: 每个标签 Badge 右上角显示悬停可见的停用/启用按钮（✕/✓），点击即可切换
  - **新增标签对话框增强**: 分组字段支持从已有分组下拉选择或自定义输入
  - **编辑标签对话框**: 包含名称、分组、状态切换，保存调用 `dictsApi.updateTag(id, data)`

### 任务2: 手机端摄像头扫码出库

#### 2.1 安装 html5-qrcode
- `bun add html5-qrcode` — 轻量级条码/二维码扫描库，支持 EAN-13, Code-128, Code-39 等格式

#### 2.2 创建 BarcodeScanner 组件
- 新建 `src/components/inventory/barcode-scanner.tsx`
- 组件接口: `{ onScan: (code: string) => void; onClose: () => void; open: boolean }`
- 功能:
  - 两种模式切换: 摄像头扫码 / 手动输入
  - 摄像头模式: 动态 import Html5Qrcode, 使用后置摄像头 (`facingMode: 'environment'`) 实时扫描
  - 扫描成功后自动关闭摄像头并调用 onScan 回调
  - HTTPS 检测: 非 HTTPS 环境下显示提示信息，引导用户切换手动模式
  - 摄像头权限错误、未检测到设备等异常情况的友好提示
  - 手动输入模式: 文本输入框 + 回车提交

#### 2.3 集成到库存页快速出库区域
- `inventory-tab.tsx` 修改:
  - 新增 `showScanner` 状态和 `handleBarcodeScan` 方法
  - 扫码按钮: 移动端（md:hidden）显示大按钮"📷 扫码"，桌面端显示仅图标按钮
  - 扫码成功后: 自动调用 `itemsApi.lookupBySku(code)` 查询货品，在库则弹出出库对话框
  - 新增 Camera 图标 import

### 验证结果
- ✅ ESLint lint 通过（0 errors, 0 warnings）
- ✅ Dev server 运行正常
- ✅ 标签在入库/编辑弹窗中按分组展示
- ✅ 设置页标签支持分组筛选、编辑、停用/启用
- ✅ 扫码按钮在库存页显示（移动端大按钮+桌面端图标按钮）
- ✅ BarcodeScanner 组件支持摄像头扫码和手动输入两种模式

### 关键文件变更
- `src/components/inventory/item-create-dialog.tsx` — 标签按 groupName 分组展示（高货+通货两个模式）
- `src/components/inventory/item-edit-dialog.tsx` — 标签按 groupName 分组展示
- `src/components/inventory/settings-tab.tsx` — 分组筛选/标签编辑/停用启用/分组下拉选择
- `src/components/inventory/barcode-scanner.tsx` — 新建，摄像头扫码组件（html5-qrcode）
- `src/components/inventory/inventory-tab.tsx` — 集成扫码按钮+BarcodeScanner

---
Task ID: 3
Agent: main
Task: 数据导入功能 + 最终验证

### 数据导入功能

#### 后端 API
- `POST /api/import/items` — 批量导入库存数据
  - 支持 CSV 文件上传（UTF-8 BOM 兼容）
  - 自动列名映射（支持多种中文名：SKU编号/SKU/sku → skuCode 等）
  - 自动创建缺失的材质/器型/标签（可选）
  - SKU 已存在时跳过或更新（可选）
  - 自动生成 SKU（材质缩写+日期+序号）
  - 器型自动配置 specFields（手镯→圈口必填，戒指→戒圈必填等）
  - 50条批量提交，记录成功/失败详情
  - 操作日志记录
- `POST /api/import/sales` — 批量导入销售数据
  - 通过 SKU 关联到现有货品
  - 自动创建客户（可选）
  - 渠道中文映射（门店→store，微信→wechat）
  - 自动更新货品状态为 sold
- `GET /api/import/template?type=items|sales` — 下载导入模板
  - UTF-8 BOM 兼容 Excel
  - 包含所有列头和示例数据

#### 前端 UI
- 系统设置页新增"数据导入"Tab（从5个改为6个）
- 导入类型选择（库存/销售）
- 拖拽或点击上传 CSV
- 数据预览（前5行）
- 导入选项（自动创建缺失/SKU跳过）
- 导入结果展示（成功/失败数量、失败详情表格、失败记录下载）

#### API 客户端
- `importApi.importItems(file, options)` — 库存导入
- `importApi.importSales(file, options)` — 销售导入
- `importApi.downloadTemplate(type)` — 下载模板

### 验证结果
- ✅ ESLint lint 通过（0 errors, 0 warnings）
- ✅ Dev server 运行正常
- ✅ 所有 API 端点正常

### 本轮完成的所有功能总览
1. ✅ 材质大类分类（category 字段 + 级联下拉）
2. ✅ 器型必填参数（specFields 升级为对象格式 + 必填标记）
3. ✅ 柜台号必填校验
4. ✅ 字段中文化（specFields 勾选式 UI + 中文标签）
5. ✅ 标签分类优化（按分组展示 + 编辑/停用/启用）
6. ✅ 手机端摄像头扫码出库（html5-qrcode）
7. ✅ 数据批量导入（CSV 库存/销售 + 模板下载）
8. ✅ 操作日志前端页面（已验证完善）
9. ✅ 数据备份/恢复（已验证完善）

---
Task ID: 2
Agent: feature-enhancer-2
Task: UX增强 + 操作日志Tab + 备份优化 + 预警配置 + 批次级联 + 种子数据

### 1. 批次详情UX增强 (batch-detail-dialog.tsx)
- **录入进度条**: 顶部显示 Progress 组件，显示"已录入 X / 声明 Y 件"进度
- **快速添加货品按钮**: 当录入数 < 声明数时，显示"快速添加货品"按钮
- **自动继承批次信息**: 点击快速添加后，ItemCreateDialog 自动切换到通货模式并预选当前批次，继承材质、供应商、采购日期、器型
- **点击查看货品详情**: 批次内货品列表行可点击查看 ItemDetailDialog，每行还有独立眼睛图标按钮
- ItemCreateDialog 新增 `defaultBatchId` 和 `defaultBatchInfo` 可选参数

### 2. 操作日志前端Tab (logs-tab.tsx) — 新建
- 列表展示所有操作日志，含分页
- 显示: 时间、操作类型、对象类型、对象ID、详情、操作人
- 操作类型颜色徽章:
  - 入库=绿色, 编辑=蓝色, 删除=红色, 出库=琥珀色, 退货=橙色, 分摊=紫色
- 筛选: 按操作类型下拉 + 日期范围
- 自动刷新: 每10秒自动刷新（可开关）
- 已集成到 page.tsx 的 `logs` tab（已有 `LogsTab` 导入和 `case 'logs'` 分支）

### 3. 数据备份/恢复前端增强 (settings-tab.tsx)
- **上次备份时间**: 下载备份后显示"上次备份"时间戳（Clock图标）
- **恢复确认**: 已有确认对话框（含安全副本自动保存 + 覆盖警告）
- 备份下载和恢复功能保持不变

### 4. 压货预警天数配置 (settings-tab.tsx + dashboard-tab.tsx)
- settings-tab.tsx: 压货预警天数配置改用 `warning_days` 键（原 `aging_threshold_days` 保留为兼容）
- dashboard-tab.tsx: 启动时从 `/api/config` 读取 `warning_days` 值作为初始阈值
- 前端仍可在看板页手动调整阈值并实时刷新
- seed.ts 新增 `warning_days` 配置项（默认90天）

### 5. 批次创建对话框 - 材质级联下拉 (batch-create-dialog.tsx)
- 新增材质大类第一级下拉（玉/贵金属/水晶/文玩/其他）
- 第二级材质下拉根据大类筛选
- 切换大类时自动清空已选材质
- 导入 `MATERIAL_CATEGORIES` 从 settings-tab.tsx

### 6. 种子数据 - 批次关联货品 (seed.ts)
- 创建3个示例批次: FC-20260101-001(翡翠手镯5件), HTY-20260201-001(和田玉吊坠3件), FJ-20260301-001(粉晶手串10件)
- 创建14个货品，其中10个关联批次:
  - FC批次3/5件已录入（2件待录入）
  - HTY批次2/3件已录入（1件待录入）
  - FJ批次5/10件已录入（5件待录入）
- 4个独立高货（无批次关联）
- 3个示例客户 + 3条销售记录
- 使用 upsert 避免重复数据冲突

### 验证结果
- ✅ ESLint lint 通过（0 errors, 0 warnings）
- ✅ Dev server 运行正常
- ✅ 数据库同步成功（prisma db push）
- ✅ 种子数据更新成功（批次+货品+客户+销售）
- ✅ 所有 API 端点正常（/api/config, /api/logs, /api/backup, /api/batches）
- ✅ 新增 `warning_days` 配置项已生效

### 关键文件变更
- `src/components/inventory/batch-detail-dialog.tsx` — 录入进度条 + 快速添加 + 自动继承 + 货品详情
- `src/components/inventory/item-create-dialog.tsx` — 新增 defaultBatchId/defaultBatchInfo 参数
- `src/components/inventory/logs-tab.tsx` — 新建，操作日志前端Tab
- `src/components/inventory/settings-tab.tsx` — warning_days配置 + 备份时间显示
- `src/components/inventory/dashboard-tab.tsx` — 读取warning_days配置
- `src/components/inventory/batch-create-dialog.tsx` — 材质级联下拉
- `prisma/seed.ts` — 批次关联货品 + warning_days配置

---
Task ID: 4
Agent: cron-agent
Task: 批次-库存关联增强 + QA测试 + UI细节优化

### 1. 修复旧版batch创建API (items/batch/route.ts)
- 添加 `batchId` FK 关联支持（原版只设 batchCode 字符串不设 batchId）
- 自动解析 batchCode → batchId 双向查找
- 添加 counter 字段支持和操作日志记录

### 2. 批次管理页面增强 (batches-tab.tsx)
- **"已录入"列**: 显示 `{itemsCount}/{quantity}`，三色标记（绿=已满/琥珀=部分/灰=未录入）
- **"待录入"统计卡片**: 第5张卡片显示 itemsCount < quantity 的批次数（ClipboardList图标，橙色）
- **批次类型标签**: 批次编号旁显示 Badge——"已关联货品"（绿色）或"未录入"（灰色）
- 统计卡片网格改为 5 列: `grid-cols-2 md:grid-cols-5`

### 3. 库存管理页面增强 (inventory-tab.tsx)
- **"所属批次"列**: 桌面表格和移动端卡片视图均显示批次 Badge，点击跳转批次Tab
- **批次筛选器**: 筛选栏新增"全部批次"下拉，选中后只显示该批次的货品
- 筛选栏改为 7 列: `md:grid-cols-7`

### 4. 批次详情增强 (batch-detail-dialog.tsx)
- **"库龄"列**: 显示货品入库天数，>90天红色高亮（Clock图标）
- **成本显示优化**: 有分摊成本显示绿色，无则显示灰色预估成本 + InfoTip 提示

### 5. 通用组件增强 (shared.tsx)
- **InfoTip 组件**: 可复用的 Tooltip 提示组件（Info图标 + hover显示说明文字）

### 6. Dashboard增强 (dashboard-tab.tsx)
- **批次录入进度概览**: 看板页新增卡片，显示未录完的批次列表和进度条
- 全部录完时显示"所有批次已全部录入"（CheckCircle图标）

### 7. 销售页增强 (sales-tab.tsx)
- **"今日"统计行**: 顶部新增今日销售数/今日营收/今日利润统计

### 8. 移动端卡片增强 (inventory-tab.tsx)
- 批次 Badge 显示在移动端卡片
- 预估成本显示（~后缀）与桌面一致
- >90天库龄红色高亮

### 9. 客户购买历史增强 (customers-tab.tsx)
- 购买历史中显示所属批次 Badge（琥珀色，区分于渠道标签）

### 验证结果
- ✅ ESLint lint 通过（0 errors, 0 warnings）
- ✅ agent-browser 全7页面 QA 测试零错误零警告
- ✅ 批次→货品 FK 关联数据验证正确（6批次，10件关联货品）
- ✅ 批次筛选器功能正常（选择批次后库存只显示该批次货品）
- ✅ 批次录入进度条/快速添加功能正常
- ✅ Dashboard批次录入进度概览正常显示

### 关键文件变更
- `src/app/api/items/batch/route.ts` — batchId FK 关联修复
- `src/components/inventory/batches-tab.tsx` — 已录入列+待录入卡片+已关联标签
- `src/components/inventory/inventory-tab.tsx` — 所属批次列+批次筛选+移动端增强
- `src/components/inventory/batch-detail-dialog.tsx` — 库龄列+成本显示优化+InfoTip
- `src/components/inventory/shared.tsx` — InfoTip 组件
- `src/components/inventory/dashboard-tab.tsx` — 批次录入进度概览
- `src/components/inventory/sales-tab.tsx` — 今日统计行
- `src/components/inventory/customers-tab.tsx` — 购买历史批次显示

### 未解决/待改进
- 登录认证系统（JWT + 密码修改，单用户NAS场景优先级低）
- 图片缩略图生成（当前仅保存原图）
- 批量操作（批量删除/批量修改状态）
- 同比环比数据对比图表
- GitHub推送最新代码
