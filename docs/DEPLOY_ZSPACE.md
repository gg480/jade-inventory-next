# 极空间 NAS 部署指南 — 翡翠珠宝进销存管理系统

## 前提条件

| 要求 | 说明 |
|------|------|
| 极空间型号 | Z2S / Z4S / Z4 Pro / Q2 等支持 Docker 的型号 |
| Docker | 极空间自带容器管理功能 |
| 磁盘空间 | ≥ 1GB（镜像约600MB + 数据） |
| 内存 | ≥ 1GB 可用 |
| 网络 | NAS 需能访问互联网（拉取镜像） |

---

## 方式一：极空间图形界面部署（推荐）

### 第一步：创建数据目录

1. 打开极空间「文件管理」
2. 进入你常用的存储空间（如「个人空间」或「共享空间」）
3. 新建文件夹 `jade-inventory`
4. 在 `jade-inventory` 下再新建两个子文件夹：
   - `db` — 存放数据库
   - `upload` — 存放货品图片

### 第二步：拉取镜像

1. 打开极空间「容器管理」
2. 点击「镜像」→「添加」
3. 选择「Docker Hub 官方库」
4. 搜索镜像名：`lrunningmjgoat/jade-inventory-next`
5. 选择 `latest` 标签，点击「下载」
6. 等待镜像下载完成（约 300-600MB，视网络速度而定）

> **提示**：如果 Docker Hub 下载缓慢，可配置国内镜像加速器：
> - 在「容器管理」→「设置」→「镜像加速」中添加加速地址
> - 推荐加速器：`https://docker.1ms.run` 或 `https://docker.xuanyuan.me`

### 第三步：创建容器

1. 在「容器管理」→「容器」中，点击「创建容器」
2. 选择刚才下载的 `lrunningmjgoat/jade-inventory-next:latest` 镜像

#### 基本设置

| 配置项 | 值 |
|--------|-----|
| 容器名称 | `jade-inventory` |
| 重启策略 | 「始终重启」或 `unless-stopped` |

#### 端口映射

| 主机端口 | 容器端口 | 协议 |
|----------|----------|------|
| 3000 | 3000 | TCP |

> 如果 3000 端口被占用，可改为其他端口（如 8080、9090 等）

#### 目录挂载（关键步骤！）

| 宿主机路径 | 容器路径 | 读写权限 | 说明 |
|------------|----------|----------|------|
| `/data/jade-inventory/db` | `/app/db` | 读写 | 数据库（所有业务数据） |
| `/data/jade-inventory/upload` | `/app/upload` | 读写 | 货品图片 |

> **重要**：宿主机路径需要根据你实际的存储空间调整。
> - 个人空间路径通常为：`/data/个人空间/jade-inventory/db`
> - 共享空间路径通常为：`/data/共享空间/jade-inventory/db`
> - 你可以通过 SSH 执行 `ls /data/` 查看实际目录名

#### 环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 生产环境模式 |
| `DATABASE_URL` | `file:/app/db/custom.db` | 数据库路径（不要修改） |
| `ADMIN_PASSWORD` | `你的安全密码` | ⚠️ 首次登录管理员密码，请设置强密码 |
| `TZ` | `Asia/Shanghai` | 时区设置 |

### 第四步：启动并访问

1. 点击「创建」启动容器
2. 等待约 30 秒，容器状态变为「运行中」
3. 在浏览器中访问：`http://NAS的IP地址:3000`

> **首次启动**：系统会自动初始化数据库并创建管理员账户，可能需要 10-30 秒。

---

## 方式二：SSH + Docker Compose 部署

### 第一步：SSH 登录极空间

```bash
ssh root@你的NAS_IP
# 密码为极空间管理员密码
```

### 第二步：创建数据目录

```bash
# 创建持久化数据目录
mkdir -p /data/jade-inventory/db
mkdir -p /data/jade-inventory/upload

# 设置写入权限
chmod -R 777 /data/jade-inventory
```

### 第三步：创建 docker-compose.yml

```bash
cat > /data/jade-inventory/docker-compose.yml << 'EOF'
services:
  jade-inventory:
    image: lrunningmjgoat/jade-inventory-next:latest
    container_name: jade-inventory
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/db/custom.db
      - ADMIN_PASSWORD=admin123
      - TZ=Asia/Shanghai
    volumes:
      - /data/jade-inventory/db:/app/db
      - /data/jade-inventory/upload:/app/upload
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/stats/quick"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
EOF
```

> ⚠️ **安全提醒**：请将 `ADMIN_PASSWORD=admin123` 改为你自己的强密码！

### 第四步：启动服务

```bash
cd /data/jade-inventory
docker compose up -d
```

### 第五步：验证运行

```bash
# 查看容器状态
docker compose ps

# 查看启动日志
docker compose logs -f jade-inventory

# 测试服务是否响应
wget -qO- http://localhost:3000/api/stats/quick
```

---

## 方式三：极空间 Compose 项目部署

部分极空间固件支持「项目」功能：

1. 打开「容器管理」→「项目」
2. 点击「创建」
3. 项目名称：`jade-inventory`
4. 路径选择：`/data/jade-inventory`
5. 将上方 docker-compose.yml 内容粘贴到编辑框
6. 点击「部署」

---

## 首次使用

1. 浏览器访问 `http://NAS的IP:3000`
2. 使用管理员账户登录：
   - 用户名：`admin`
   - 密码：你设置的 `ADMIN_PASSWORD`（默认 `admin123`）
3. **首次登录后请立即修改密码**

---

## 日常运维

### 更新到最新版本

```bash
cd /data/jade-inventory
docker compose pull          # 拉取最新镜像
docker compose up -d         # 重新启动（自动使用新镜像）
```

### 查看日志

```bash
docker compose logs -f                # 实时日志
docker compose logs --tail 100        # 最近100行
docker compose logs --since 1h        # 最近1小时
```

### 重启服务

```bash
docker compose restart
```

### 停止服务

```bash
docker compose down          # 停止容器（数据不会丢失）
```

---

## 数据备份

### 手动备份

```bash
# 备份整个数据目录
cp -r /data/jade-inventory /data/backup/jade_$(date +%Y%m%d)

# 仅备份数据库（最重要）
cp /data/jade-inventory/db/custom.db /data/backup/jade_db_$(date +%Y%m%d).db
```

### 定时自动备份

```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨3点自动备份
0 3 * * * cp /data/jade-inventory/db/custom.db /data/backup/jade_db_$(date +\%Y\%m\%d).db
```

### 数据恢复

```bash
# 1. 停止服务
cd /data/jade-inventory && docker compose down

# 2. 恢复数据库
cp /data/backup/jade_db_YYYYMMDD.db /data/jade-inventory/db/custom.db

# 3. 重启服务
docker compose up -d
```

---

## 外网访问（可选）

如需在家庭网络外访问系统，可通过以下方式：

### 方案一：极空间自带远程访问

极空间支持自带的远程连接功能，在极空间 App 中可直接访问。

### 方案二：路由器端口转发

1. 登录路由器管理界面
2. 设置端口转发：外部端口 → NAS的IP:3000
3. 使用公网IP或DDNS域名访问

> ⚠️ **安全警告**：外网暴露时务必设置强密码，建议搭配 HTTPS 反向代理（如 Nginx/Caddy）

---

## 常见问题

### 1. 镜像下载慢/超时

配置 Docker 镜像加速器：

```bash
# SSH 登录后执行
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
EOF

# 重启 Docker
systemctl restart docker
```

### 2. 容器启动后无法访问

```bash
# 检查容器是否正常运行
docker ps | grep jade-inventory

# 查看错误日志
docker logs jade-inventory

# 检查端口是否被占用
netstat -tlnp | grep 3000
```

### 3. 数据库权限错误

```bash
# 修复目录权限
chmod -R 777 /data/jade-inventory/db
docker compose restart
```

### 4. 图片上传失败

```bash
# 检查上传目录权限
chmod -R 777 /data/jade-inventory/upload
docker compose restart
```

### 5. 忘记管理员密码

```bash
# 进入容器
docker exec -it jade-inventory sh

# 重置数据库（会清空所有数据！）
rm /app/db/custom.db
exit

# 重启容器，系统会自动重新初始化
docker compose restart
```

---

## 数据目录结构

```
/data/jade-inventory/
├── docker-compose.yml       ← Compose 配置文件
├── db/
│   └── custom.db            ← SQLite 数据库（核心！）
└── upload/
    ├── item_1_abc123.jpg    ← 货品图片
    ├── item_2_def456.png
    └── ...
```

---

## 系统架构

```
手机/电脑浏览器
      │
      ▼ http://NAS_IP:3000
┌─────────────────────────────┐
│  极空间 NAS Docker 容器      │
│  ┌───────────────────────┐  │
│  │  Next.js Standalone   │  │
│  │  (Node.js 22 Alpine)  │  │
│  │  端口: 3000           │  │
│  └───────────────────────┘  │
│      │            │         │
│      ▼            ▼         │
│  /app/db/     /app/upload/  │
│  SQLite数据库   货品图片     │
│      │            │         │
└──────┼────────────┼─────────┘
       │            │
       ▼            ▼
  /data/jade-inventory/db/    ← 持久化到NAS磁盘
  /data/jade-inventory/upload/
```
