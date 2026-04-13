# 玉器店进销存系统 - 项目工作日志

## 项目当前状态描述/判断

### 原始项目分析（jade-inventory）
- **技术栈**: Python FastAPI + Vue 3 + SQLite + Tailwind CSS
- **完成度**: P0核心功能~100%, P1分析功能~100%, P2扩展功能~80%
- **后端**: 14张表 + 11个路由文件 + 53个API端点
- **前端**: 16个视图 + 9个组件 + ECharts图表
- **特点**: 双轨库存模型(高货/通货)、成本分摊算法、批次回本看板、贵金属市价管理

### 迁移目标
- **目标技术栈**: Next.js 16 + React + Prisma(SQLite) + Tailwind CSS + shadcn/ui
- **单页应用**: 所有功能在 / 路由下实现（SPA模式，Tab导航）
- **数据库**: Prisma ORM + SQLite（14张表已完成）
- **图表**: recharts（已安装）
- **UI组件**: shadcn/ui（完整组件库）

### 已完成工作
- ✅ Prisma schema 14张表
- ✅ 全部 API 路由（dashboard/dicts/items/sales/batches/customers/suppliers/metal-prices/config/export）
- ✅ 前端 API 客户端 (api.ts)
- ✅ Zustand 状态管理 (store.ts)
- ✅ 种子数据脚本 (seed.ts) - 36材质+9器型+20标签+4配置+2市价+3供应商
- ✅ Dashboard 看板页（概览卡片+品类利润+渠道饼图+销售趋势+批次回本+压货预警）
- ✅ 库存列表页（筛选+表格+分页+销售出库弹窗+删除）
- ✅ 销售记录页（筛选+表格+分页）
- ✅ 批次列表页（统计+表格+分摊按钮）
- ✅ 客户管理页（搜索+卡片+创建弹窗）
- ✅ 系统设置页（字典管理4Tab+贵金属市价+供应商+系统配置）

### 缺失关键功能
- ❌ 入库表单（高货/通货双轨入库）
- ❌ 批次创建表单
- ❌ 货品详情查看
- ❌ 套装销售弹窗
- ❌ 数据导出功能集成
- ❌ 移动端底部导航
- ❌ 暗色模式支持
- ❌ 页面过渡动画
- ❌ 响应式优化（移动端卡片视图）

---

## 当前目标/已完成的修改/验证结果

### 阶段1: 项目分析与规划 ✅
### 阶段2: 数据库建模 ✅
### 阶段3: API路由实现 ✅
### 阶段4: 前端核心页面（部分完成）
- ✅ Dashboard/库存/销售/批次/客户/设置
- ❌ 入库表单/货品详情/套装销售

---

---

## Task 3: 前端缺失功能补全 (2026-04-13)

### 完成的修改

#### 1. store.ts 更新
- 新增 `theme` 和 `setTheme` 状态，支持 light/dark/system 三种主题偏好

#### 2. layout.tsx 更新
- 添加 `ThemeProvider` from next-themes（attribute="class", defaultTheme="system"）
- 更换 `Toaster` 为 sonner 版本（richColors, position="top-right"）
- 修改 `lang` 为 "zh-CN"
- 更新 metadata title/description

#### 3. page.tsx 完整重写
新增功能：
- **ItemCreateDialog** - 新增入库对话框，支持高货入库/通货入库双模式
  - 高货模式：材质、器型、成本价、售价、名称、产地、柜台、证书号、供应商、采购日期、动态规格字段、标签选择、备注
  - 通货模式：选择批次、售价、名称、柜台、证书号、器型、动态规格字段、标签选择、备注
  - 规格字段根据选择的器型 `specFields` JSON 动态渲染
- **ItemDetailDialog** - 货品详情对话框
  - 显示所有字段（SKU、名称、材质、器型、状态、库龄、批次、成本价、分摊成本、底价、售价、产地、柜台、证书号、供应商、采购日期、创建时间）
  - 规格参数详情
  - 标签展示
  - 销售记录（如已售）
  - 图片占位区域
  - 备注信息
- **BatchCreateDialog** - 新建批次对话框
  - 批次编号、材质、器型、数量、总成本、分摊方式、供应商、采购日期、备注
- **BundleSaleDialog** - 套装销售对话框
  - 多货品选择（Checkbox列表）
  - 套装总价（自动计算标价合计）
  - 分摊方式选择（by_ratio按售价比例 / chain_at_cost链按售价+余入主件）
  - 链类货品勾选（chain_at_cost模式时）
  - 渠道、日期、客户、备注
- **ThemeToggle** - 深色模式切换按钮（下拉菜单：浅色/深色/跟随系统）
- **MobileNav** - 移动端底部导航栏（6个Tab，emerald主色）
- **DesktopNav** - 桌面端顶部导航栏（含深色模式切换按钮）
- **Sticky Footer** - 桌面端显示的底部信息栏
- **Export Buttons** - 库存/销售/批次页面的导出按钮

新增 shadcn/ui 组件使用：
- Checkbox（标签选择、套装货品选择）
- DropdownMenu（深色模式切换）

新增 imports：
- next-themes `useTheme`
- `Checkbox`, `DropdownMenu*` from shadcn/ui
- `Moon`, `Sun`, `Monitor`, `Link2`, `FileDown`, `ImageIcon` from lucide-react

布局改进：
- 使用 `min-h-screen flex flex-col` 根布局
- footer 使用 `mt-auto` 实现自然推下效果
- 移动端底部导航 `pb-safe` 支持 iOS 安全区域
- 主内容区 `pb-20 md:pb-6` 适配移动端底部导航

### 验证结果
- ✅ ESLint lint 通过（0 errors, 0 warnings）
- ✅ Dev server 运行正常，API 返回 200
- ✅ 所有 API 路由正常响应

### 未解决/待改进
- 图片上传功能需要后端 multipart 支持
- 移动端卡片视图（库存列表在小屏幕上）
- 页面过渡动画
