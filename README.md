# 🟢 Jade Inventory Next — 翡翠珠宝进销存管理系统

一款面向中小型翡翠珠宝零售门店的全功能业务管理工具，覆盖采购入库、库存管理、销售记录、客户管理、数据分析的完整业务链。

## ✨ 功能亮点

| 模块 | 核心能力 |
|------|---------|
| **📊 利润看板** | 5大KPI卡片 + 20+分析图表 + 多时段筛选 + 环比对比 |
| **📦 库存管理** | 多维筛选/扫码开单/批量操作/行内编辑/图片灯箱/CSV导出 |
| **🛒 销售记录** | 单品/套装销售 + 退货 + 支付跟踪(5状态×5方式) + 渠道分析 |
| **📋 批次管理** | 通货采购 → 录入进度追踪 → 成本分摊(3方式) → ROI排行 |
| **👥 客户管理** | VIP4层分级 + 消费画像 + 偏好分析 + 标签体系 + 购买时间线 |
| **📝 操作日志** | 全操作审计 + 类型颜色标识 + 筛选搜索 |
| **⚙️ 系统设置** | 字典管理/贵金属调价/供应商/备份恢复/数据导入/密码管理 |

## 🚀 快速开始

### Docker 部署（推荐）

```bash
# 1. 拉取镜像
docker pull gg480/jade-inventory-next:latest

# 2. 启动服务
docker run -d \
  --name jade-inventory \
  -p 3000:3000 \
  -e ADMIN_PASSWORD=your_secure_password \
  -v jade-db:/app/db \
  -v jade-uploads:/app/upload \
  --restart unless-stopped \
  gg480/jade-inventory-next:latest
```

### Docker Compose

```bash
# 克隆仓库
git clone https://github.com/gg480/jade-inventory-next.git
cd jade-inventory-next

# 设置密码并启动
ADMIN_PASSWORD=your_secure_password docker compose up -d
```

访问 http://localhost:3000 即可使用。

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/gg480/jade-inventory-next.git
cd jade-inventory-next

# 安装依赖
bun install

# 初始化数据库
bun run db:push
bun run db:generate
ADMIN_PASSWORD=admin123 bun run db:seed

# 启动开发服务器
bun run dev
```

## 🔧 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | 否 | `file:./db/custom.db` | SQLite 数据库路径 |
| `ADMIN_PASSWORD` | 否 | `admin123` | 管理员初始密码（首次启动生效） |
| `NODE_ENV` | 否 | `production` | 运行环境 |
| `PORT` | 否 | `3000` | 服务端口 |

> ⚠️ **安全提示**：生产环境请务必通过 `ADMIN_PASSWORD` 设置强密码，并在首次登录后修改。

## 🏗️ 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript 5
- **数据库**: SQLite + Prisma ORM 6
- **UI**: shadcn/ui + Tailwind CSS 4 + Lucide Icons
- **图表**: Recharts 2
- **状态**: Zustand 5
- **认证**: 自定义 Token-Session (PBKDF2+SHA512 哈希)
- **部署**: Docker (Alpine) + GitHub Actions CI/CD

## 📁 项目结构

```
src/
├── app/api/           # 50+ API 路由
├── components/
│   ├── inventory/     # 22 个业务组件
│   └── ui/            # 48 个 shadcn/ui 组件
├── hooks/             # 自定义 Hook
├── lib/               # 工具库 (auth/db/store/log)
└── middleware.ts       # API 鉴权中间件
```

## 🔒 安全特性

- ✅ 所有 API 端点鉴权保护（middleware.ts）
- ✅ 密码 PBKDF2+SHA512 哈希存储，100000 次迭代
- ✅ Session Token 加密安全随机数生成（crypto.randomBytes）
- ✅ 登录限速（15分钟5次/IP）
- ✅ 敏感配置字段API过滤
- ✅ 错误信息脱敏
- ✅ Docker 非 root 用户运行
- ✅ 操作日志全审计

## 📱 界面预览

系统支持桌面端和移动端自适应布局，提供深色/浅色/系统三种主题模式。

**主要页面**:
- 🔐 登录页 — 简洁密码登录
- 📊 利润看板 — KPI卡片 + 多维图表
- 📦 库存管理 — 表格/卡片视图 + 扫码开单
- 🛒 销售记录 — 支付跟踪 + 退货处理
- 📋 批次管理 — 录入进度 + 成本分摊
- 👥 客户管理 — VIP分层 + 消费画像

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `1-7` | 切换 Tab 页 |
| `Ctrl+K` | 聚焦搜索 |
| `Ctrl+N` | 新增货品 |
| `Ctrl+E` | 导出数据 |
| `Ctrl+Shift+N` | 快速新增货品（任意页面） |
| `Ctrl+Shift+S` | 快速新增销售 |
| `Ctrl+Shift+B` | 快速新增批次 |
| `?` | 查看快捷键帮助 |

## 📄 文档

- [产品需求文档 (PRD)](docs/PRD.md)
- [技术规格文档](docs/TECH_SPEC.md)
- [用户手册](docs/USER_MANUAL.md)

## 📜 License

MIT
