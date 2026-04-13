# 玉器店进销存系统 - 项目工作日志

## 项目当前状态描述/判断

### 迁移完成状态：~95%
- **技术栈**: Next.js 16 + React + Prisma(SQLite) + Tailwind CSS + shadcn/ui + recharts
- **代码规模**: page.tsx ~2126行，14个Prisma表，53个API端点
- **测试数据**: 23个货品 + 3个批次 + 5条销售记录 + 3个客户
- **核心功能**: 全部完成（双轨入库/出库/退货/编辑/套装销售/成本分摊/回本看板）
- **UI质量**: 高（暗色模式/移动端响应式/过渡动画/图标装饰/卡片视图）
- **稳定性**: 高（lint通过/所有API正常/浏览器QA通过）

### 已完成工作总览
- ✅ Prisma schema 14张表
- ✅ 全部 API 路由（dashboard/dicts/items/sales/batches/customers/suppliers/metal-prices/config/export）
- ✅ 前端 API 客户端 (api.ts)
- ✅ Zustand 状态管理 (store.ts)
- ✅ 种子数据脚本 (seed.ts)
- ✅ Dashboard 看板页（增强版概览卡片+品类利润+渠道饼图+销售趋势+批次回本+压货预警）
- ✅ 库存列表页（筛选+表格+分页+销售出库弹窗+删除+编辑+退货+移动端卡片视图）
- ✅ 销售记录页（筛选+表格+分页+套装销售）
- ✅ 批次列表页（统计+表格+分摊按钮+创建弹窗）
- ✅ 客户管理页（搜索+卡片+创建弹窗+展开详情+购买历史）
- ✅ 系统设置页（字典管理4Tab+贵金属市价+供应商+系统配置）
- ✅ 货品编辑对话框（ItemEditDialog）
- ✅ 货品退货确认对话框
- ✅ 移动端底部导航栏
- ✅ 暗色模式切换（light/dark/system）
- ✅ 页面Tab切换过渡动画（fadeIn）
- ✅ Dashboard卡片增强（大图标装饰+hover缩放+加粗数字）

---

## 当前目标/已完成的修改/验证结果

### 阶段1-4: 全部完成 ✅

---

## Task 5: QA测试 + Bug修复 + 功能补全 (2026-04-13)

### 完成的修改

#### 1. Bug修复: 批次货品库龄显示为'-'
**问题**: 批次入库的货品没有purchaseDate，导致库龄计算返回null
**修复**:
- `items/route.ts` (GET列表): 添加batch关联查询，使用`item.purchaseDate || item.batch?.purchaseDate`计算有效采购日期
- `items/[id]/route.ts` (GET详情): 同样从batch继承purchaseDate，同时从batch继承supplierName

#### 2. Bug修复: 批次成本分挂数量校验
**问题**: `allocate`接口要求`items.length === batch.quantity`，但实际货品可能多于或少于批次数量
**修复**:
- `batches/[id]/allocate/route.ts`: 将严格相等改为`items.length < batch.quantity`即可分摊
- 成功对批次B2026-001执行了成本分摊（均摊方式，¥5000/件）

#### 3. Bug修复: 通货入库API类型转换
**问题**: `counter`字段传入字符串但数据库期望Int；`spec`字段数值类型未转换
**修复**:
- `items/route.ts` (POST): `counter: counter ? parseInt(counter) : null`
- 新增spec字段类型转换（weight→parseFloat, beadCount→parseInt）
- 批次入库时自动从batch获取materialId

#### 4. 已有功能确认（由之前session实现）
- **ItemEditDialog** (line 787): 编辑货品名称/售价/底价/柜台/证书/备注/产地/标签/规格
- **退货确认对话框**: 已售货品可退货（status→returned）
- **Dashboard增强**: 大图标背景+hover缩放+3xl加粗数字
- **Tab过渡动画**: fadeIn 0.3s ease-out
- **移动端卡片视图**: `md:hidden` grid布局卡片
- **客户详情展开**: 点击展开查看总消费/购买次数/最近购买/购买历史

### 验证结果
- ✅ ESLint lint 通过（0 errors, 0 warnings）
- ✅ Dev server 运行正常
- ✅ 所有API路由正常（dashboard/items/sales/batches/customers 200 OK）
- ✅ agent-browser QA测试通过：Dashboard/库存/销售/客户/设置页面均正常渲染
- ✅ 编辑对话框可正常打开并显示数据（含分摊成本¥5000）
- ✅ 暗色模式切换正常（document.documentElement.className → "dark"）
- ✅ 无JS控制台错误

### 未解决/待改进
- 图片上传功能需要后端 multipart 支持
- 页面组件拆分（page.tsx 2126行过大，建议拆分为独立组件文件）
- 更多的批量操作（批量删除/批量修改状态）
- 数据统计导出为Excel功能完善
- 货品图片管理和展示
- 更丰富的数据可视化（对比图表、同比环比）
