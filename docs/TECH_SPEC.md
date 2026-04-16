# 翡翠珠宝进销存 — 技术规格文档

> 版本: 1.0.0  
> 日期: 2026-04-17  
> 基于: PRD v1.0.0

---

## 1. 技术栈总览

| 层次 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **框架** | Next.js (App Router) | 16.x | SSR/SSG/全栈框架 |
| **语言** | TypeScript | 5.x | 类型安全 |
| **运行时** | Node.js / Bun | 22.x / 1.x | 服务端运行 + 脚本 |
| **数据库** | SQLite | 3.x | 嵌入式关系型数据库 |
| **ORM** | Prisma | 6.x | 数据库访问层 |
| **UI组件** | shadcn/ui (New York) | latest | 基础组件库 |
| **样式** | Tailwind CSS | 4.x | 原子化CSS |
| **图标** | Lucide React | 0.525+ | 图标库 |
| **图表** | Recharts | 2.x | 数据可视化 |
| **状态管理** | Zustand | 5.x | 客户端全局状态 |
| **表单** | React Hook Form + Zod | 7.x / 4.x | 表单验证 |
| **扫码** | html5-qrcode | 2.x | 摄像头条码扫描 |
| **CSV** | PapaParse | 5.x | CSV解析/生成 |
| **主题** | next-themes | 0.4.x | 深色/浅色模式 |
| **通知** | Sonner | 2.x | Toast通知 |
| **容器** | Docker (Alpine) | — | 生产部署 |
| **CI/CD** | GitHub Actions | — | 自动构建推送 |

---

## 2. 系统架构

### 2.1 整体架构

```
┌──────────────────────────────────────────────┐
│                  浏览器客户端                   │
│  React 19 + Next.js App Router (Client)       │
│  Zustand (全局状态) + React Query (服务端状态)   │
└──────────────────┬───────────────────────────┘
                   │ HTTP/REST (Bearer Token)
┌──────────────────▼───────────────────────────┐
│              Next.js 服务端                     │
│  ┌─────────────┐  ┌─────────────────────┐    │
│  │ middleware.ts│  │  API Routes (50+)    │    │
│  │  (鉴权守卫)  │  │  /api/auth/*         │    │
│  │             │  │  /api/items/*         │    │
│  │             │  │  /api/sales/*         │    │
│  │             │  │  /api/batches/*       │    │
│  │             │  │  /api/dashboard/*     │    │
│  │             │  │  /api/config/backup/  │    │
│  └─────────────┘  └──────────┬──────────┘    │
│                              │                │
│  ┌───────────────────────────▼──────────┐     │
│  │        Prisma ORM (SQLite)           │     │
│  │    db/custom.db (18张表)              │     │
│  └──────────────────────────────────────┘     │
└──────────────────────────────────────────────┘
```

### 2.2 认证流程

```
客户端                          服务端
  │                               │
  │  POST /api/auth {password}    │
  │──────────────────────────────→│
  │                               │ 1. 限速检查 (IP级别)
  │                               │ 2. PBKDF2+SHA512 验证
  │                               │ 3. crypto.randomBytes 生成token
  │                               │ 4. Session写入DB
  │  {token, expiresIn}           │
  │←──────────────────────────────│
  │                               │
  │  GET /api/items               │
  │  Authorization: Bearer token  │
  │──────────────────────────────→│
  │                               │ middleware.ts:
  │                               │ 1. 跳过公开路径
  │                               │ 2. 提取Bearer token
  │                               │ 3. 调用 /api/auth 验证
  │                               │ 4. 通过 → next() / 拒绝 → 401
  │  200 {data}                   │
  │←──────────────────────────────│
```

### 2.3 目录结构

```
src/
├── app/
│   ├── api/                    # 50+ API路由
│   │   ├── auth/               # 认证 (登录/验证/改密码)
│   │   ├── items/              # 货品 CRUD + 批量操作
│   │   ├── sales/              # 销售/退货/套装/支付
│   │   ├── batches/            # 批次管理 + 成本分摊
│   │   ├── customers/          # 客户管理
│   │   ├── suppliers/          # 供应商
│   │   ├── dicts/              # 字典 (材质/器型/标签)
│   │   ├── dashboard/          # 看板 (20+分析接口)
│   │   ├── metal-prices/       # 贵金属市价/调价
│   │   ├── config/             # 系统配置
│   │   ├── backup/             # 数据库备份恢复
│   │   ├── export/             # CSV导出
│   │   ├── import/             # JSON/CSV导入
│   │   ├── logs/               # 操作日志
│   │   ├── stats/              # 轻量统计
│   │   └── pricing/            # 定价建议
│   ├── globals.css             # 全局样式 + 动画
│   ├── layout.tsx              # 根布局 (主题/字体/Toaster)
│   └── page.tsx                # 主页面 (Tab切换/导航/统计栏)
├── components/
│   ├── inventory/              # 业务组件 (22个)
│   │   ├── dashboard-tab.tsx   # 利润看板
│   │   ├── inventory-tab.tsx   # 库存管理
│   │   ├── sales-tab.tsx       # 销售记录
│   │   ├── batches-tab.tsx     # 批次管理
│   │   ├── customers-tab.tsx   # 客户管理
│   │   ├── logs-tab.tsx        # 操作日志
│   │   ├── settings-tab.tsx    # 系统设置 (6子Tab)
│   │   ├── login-page.tsx      # 登录页
│   │   ├── navigation.tsx      # 导航 (桌面/移动/快捷键)
│   │   └── ...                 # 对话框/抽屉/扫描器等
│   └── ui/                     # shadcn/ui 基础组件 (48个)
├── hooks/                      # 自定义Hook
│   ├── use-mobile.ts           # 移动端检测
│   └── use-toast.ts            # Toast通知
├── lib/
│   ├── api.ts                  # API客户端封装
│   ├── auth.ts                 # 认证工具 (token生成/验证/密码哈希)
│   ├── db.ts                   # Prisma Client单例
│   ├── log.ts                  # 操作日志工具
│   ├── store.ts                # Zustand全局状态
│   └── utils.ts                # 通用工具函数
└── middleware.ts               # API鉴权中间件
```

---

## 3. 数据库设计

### 3.1 ER关系图

```
SysConfig(KV)
DictMaterial ──┬── Item ──── SaleRecord ──── SaleReturn
               │      │           │
DictType ──────┤      │           └── BundleSale
               │      ├── ItemSpec
DictTag ───────┤      ├── ItemImage (M:N via ItemTag)
               │      └── Supplier
Batch ─────────┤
               │
Customer ──────┘

MetalPrice ──── DictMaterial
User / Session / OperationLog
```

### 3.2 核心表说明

| 表名 | 行数(初始) | 说明 | 关键索引 |
|------|-----------|------|---------|
| sys_config | 6 | 系统KV配置 | key (unique) |
| dict_material | 36 | 材质字典 | name (unique) |
| dict_type | 9 | 器型字典 | name (unique) |
| dict_tag | 20 | 标签字典 | name (unique) |
| suppliers | 3 | 供应商 | - |
| customers | 3 | 客户 | customer_code (unique) |
| batches | 3 | 采购批次 | batch_code (unique) |
| items | 14 | 货品主表 | sku_code (unique), status, materialId, batchId |
| item_spec | - | 货品规格 | item_id (unique) |
| item_images | - | 货品图片 | - |
| item_tag | - | 标签关联 | [itemId, tagId] (compound PK) |
| sale_records | 3 | 销售记录 | saleNo (unique), saleDate, channel, paymentStatus |
| bundle_sales | - | 套装销售 | bundleNo (unique) |
| metal_prices | 2 | 贵金属市价 | - |
| sale_returns | - | 退货记录 | - |
| users | 0 | 管理员 | username (unique) |
| session | 2 | 会话 | token (unique), expiresAt |
| operation_log | 0 | 操作日志 | action, targetType, createdAt |

### 3.3 关键业务约束

- Item.skuCode 全局唯一，不可重复
- Item.status 枚举：in_stock / sold / returned
- Item.isDeleted 软删除标记，默认 false
- SaleRecord.saleNo 格式：`SALE-YYYY-NNNN`
- Batch.costAllocMethod 枚举：equal / by_weight / by_price
- BundleSale.allocMethod 枚举：by_ratio / chain_at_cost
- SaleRecord.paymentStatus 枚举：paid / pending / partial / overdue
- SaleRecord.paymentMethod 枚举：cash / transfer / wechat / alipay / installment
- SaleRecord.channel 枚举：store / wechat

---

## 4. API 设计规范

### 4.1 通用规范

- RESTful 风格，资源名使用复数
- 所有响应统一格式：`{ code: number, data: T, message: string }`
- 鉴权方式：`Authorization: Bearer <token>` 请求头
- 分页参数：`?page=1&pageSize=20`
- 日期格式：`YYYY-MM-DD` 字符串

### 4.2 状态码约定

| HTTP Status | 含义 |
|-------------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或会话过期 |
| 404 | 资源不存在 |
| 429 | 请求频率过高 |
| 500 | 服务器内部错误 |

### 4.3 API 端点清单（50+）

#### 认证 (3)
| Method | Path | 描述 |
|--------|------|------|
| POST | /api/auth | 密码登录 |
| GET | /api/auth | 验证会话 |
| PUT | /api/auth/password | 修改密码 |

#### 货品 (8)
| Method | Path | 描述 |
|--------|------|------|
| GET | /api/items | 列表(分页/筛选) |
| POST | /api/items | 创建 |
| GET | /api/items/[id] | 详情 |
| PUT | /api/items/[id] | 更新 |
| DELETE | /api/items/[id] | 删除(软) |
| POST | /api/items/batch | 批量创建 |
| POST | /api/items/batch-price | 批量调价 |
| GET/DELETE | /api/items/cleanup-deleted | 清理已删除 |
| POST | /api/items/[id]/images | 上传图片 |

#### 销售 (5)
| Method | Path | 描述 |
|--------|------|------|
| GET | /api/sales | 列表 |
| POST | /api/sales | 创建销售 |
| POST | /api/sales/return | 退货 |
| POST | /api/sales/bundle | 套装销售 |
| GET/PUT | /api/sales/payment | 支付状态 |

#### 批次 (5)
| Method | Path | 描述 |
|--------|------|------|
| GET | /api/batches | 列表 |
| POST | /api/batches | 创建 |
| GET/PUT/DELETE | /api/batches/[id] | 详情/更新/删除 |
| POST | /api/batches/[id]/allocate | 成本分摊 |

#### 客户 (5) / 供应商 (4) / 字典 (9) / Dashboard (20+) / 其他 (8)

（详见PRD功能需求章节）

---

## 5. 安全设计

### 5.1 认证与授权

| 组件 | 实现 |
|------|------|
| 密码存储 | PBKDF2 + SHA512, salt(32hex) + hash(128hex), 100000迭代 |
| Token生成 | `crypto.randomBytes(32).toString('base64url')` |
| 会话存储 | SQLite `session` 表，含 `expiresAt` |
| 会话有效期 | 7天，过期自动清理 |
| API鉴权 | `middleware.ts` 拦截所有 `/api/*`，仅 `/api/auth` 和 `/api/stats/quick` 放行 |
| 登录限速 | IP级别，15分钟5次上限，内存Map |
| 旧密码兼容 | 检测明文格式自动升级为哈希 |

### 5.2 数据安全

| 措施 | 描述 |
|------|------|
| 敏感字段过滤 | Config API 不返回 admin_password |
| 错误脱敏 | 生产环境返回通用错误消息，不暴露 e.message |
| 软删除 | 货品使用 isDeleted 标记，不物理删除 |
| 操作日志 | 所有CRUD操作记录到 operation_log 表 |
| 备份鉴权 | 下载/恢复数据库需Bearer Token |
| 容器安全 | Docker以 nextjs (uid 1001) 非root运行 |

---

## 6. 部署架构

### 6.1 Docker 多阶段构建

```dockerfile
Stage 1: deps    → 安装依赖 + 生成Prisma Client
Stage 2: builder → next build (standalone模式)
Stage 3: runner  → 仅复制standalone产物 + prisma runtime
```

### 6.2 运行时架构

```
Docker Container (port 3000)
├── Next.js Standalone Server (node server.js)
├── SQLite DB: /app/db/custom.db (Volume: jade-db)
├── Uploads: /app/upload/ (Volume: jade-uploads)
└── docker-entrypoint.sh (首次启动自动init DB)
```

### 6.3 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| DATABASE_URL | 否 | file:./db/custom.db | 数据库路径 |
| ADMIN_PASSWORD | 否 | admin123 | 首次初始化管理员密码 |
| NODE_ENV | 否 | production | 运行环境 |
| PORT | 否 | 3000 | 服务端口 |

### 6.4 GitHub Actions 工作流

```yaml
触发: push main/master / tag v*
步骤: checkout → buildx → dockerhub login → metadata → build+push
平台: linux/amd64 + linux/arm64
缓存: GitHub Actions Cache (mode=max)
标签: latest + semver + sha
```

---

## 7. 前端性能策略

| 策略 | 实现 |
|------|------|
| Tab懒加载 | 所有Tab组件使用 `React.lazy()` + `Suspense` |
| 图表懒加载 | IntersectionObserver 触发渲染 |
| 轻量统计 | 底部状态栏使用 `/api/stats/quick` 单接口 |
| 看板专用API | 20+独立接口避免单次大量查询 |
| BOM编码 | CSV导出UTF-8 BOM确保Excel兼容 |
| 组件缓存 | shadcn/ui 纯展示组件无state，React自动优化 |
