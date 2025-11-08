# Docker 镜像部署指南

本指南说明如何从阿里云容器镜像服务拉取 Docker 镜像并运行应用。

## 前提条件

1. 已安装 Docker 和 Docker Compose
2. 已配置阿里云容器镜像服务访问凭证
3. 已准备好 `.env` 配置文件

## 步骤 1: 登录阿里云容器镜像服务

```bash
# 使用你的阿里云账号和 Docker 登录密码
docker login crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com

# 输入用户名（例如：aliyun4681828459）
# 输入密码（Docker 登录密码）
```

## 步骤 2: 拉取 Docker 镜像

```bash
# 拉取最新版本
# 注意：如果镜像是在 amd64 架构上构建的，在 ARM Mac (Apple Silicon) 上需要使用 --platform 参数
docker pull --platform linux/amd64 crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest

# 或者拉取特定版本（使用 commit SHA）
docker pull --platform linux/amd64 crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:157dbf8ee34c42b60d1c4b6ac691aaf379c876b1

# 在 Linux amd64 服务器上（不需要 --platform 参数）
# docker pull crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
```

> **注意**：GitHub Actions 构建的镜像默认是 `linux/amd64` 架构。如果在 Apple Silicon (M1/M2/M3) Mac 上运行，需要使用 `--platform linux/amd64` 参数。Docker Desktop 会自动处理架构转换（使用 Rosetta 2）。

## 步骤 3: 配置环境变量

### 重要说明

**Docker 镜像中不包含 .env 文件**（这是正确的做法，为了安全）。环境变量通过以下方式注入到容器中：

1. **使用 `docker-compose.prod.yml` 的 `env_file` 选项**（推荐）
2. **使用 `docker run` 的 `--env-file` 参数**
3. **直接在 docker-compose.yml 或 docker run 命令中设置环境变量**

### 创建 .env 文件

在**运行 Docker 容器的主机上**（不是在容器内）创建 `.env` 文件：

```bash
# 在项目根目录创建 .env 文件
nano .env
```

`.env` 文件应包含以下变量：

```env
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 后端配置
PORT=3000
NODE_ENV=production
JWT_SECRET=your-jwt-secret

# 阿里云 DashScope API（用于 LLM）
DASHSCOPE_API_KEY=your-dashscope-api-key

# 高德地图 API（前端使用，但后端也需要知道）
# 注意：在 Docker 镜像中已经构建进去了，如果需要更新，需要重新构建镜像
VITE_AMAP_KEY=your-amap-key
```

### 环境变量注入方式

#### 方式 1: 使用 docker-compose.prod.yml（已配置）

`docker-compose.prod.yml` 文件中已经配置了 `env_file: - .env`，这会将主机上的 `.env` 文件中的环境变量注入到容器中。

```yaml
services:
  travel-planner:
    env_file:
      - .env  # 从主机上的 .env 文件加载环境变量
```

#### 方式 2: 使用 docker run 命令

```bash
docker run -d \
  --name travel-planner \
  --platform linux/amd64 \
  -p 3000:3000 \
  --env-file .env \  # 从主机上的 .env 文件加载
  --restart unless-stopped \
  crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
```

#### 方式 3: 直接设置环境变量

```bash
docker run -d \
  --name travel-planner \
  --platform linux/amd64 \
  -p 3000:3000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_ANON_KEY=your-key \
  -e DASHSCOPE_API_KEY=your-key \
  # ... 其他环境变量
  crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
```

### 验证环境变量

容器启动后，可以验证环境变量是否正确加载：

```bash
# 检查环境变量
docker exec travel-planner env | grep -E "SUPABASE|DASHSCOPE|PORT|NODE_ENV"

# 查看容器日志（应该显示环境变量已加载）
docker logs travel-planner | grep -E "Supabase|LLM|Server is running"
```

### 注意事项

1. **.env 文件位置**：`.env` 文件应该放在**运行 Docker 命令的目录**（通常是项目根目录），不是容器内部。

2. **安全性**：
   - ✅ `.env` 文件不会被打包到 Docker 镜像中
   - ✅ 环境变量通过 Docker 运行时注入
   - ✅ 确保 `.env` 文件在 `.gitignore` 中，不要提交到 Git

3. **日志提示**：
   - 在 Docker 容器中，你会看到 `ℹ️  Production mode: using environment variables from container`，这是正常的
   - 只要看到 `✅ Supabase credentials loaded successfully`，说明环境变量已正确加载

4. **高德地图 API Key**：
   - `VITE_AMAP_KEY` 在构建 Docker 镜像时已经打包进去了
   - 如果需要更新，需要重新构建镜像并推送到仓库
   - 或者在运行时通过环境变量覆盖（需要修改前端代码支持）

### 前端环境变量配置（重要）

**问题**：前端环境变量（`VITE_*`）需要在**构建 Docker 镜像时**传入，不能在运行时修改。

#### 如果使用 GitHub Actions 构建的镜像

需要在 GitHub Secrets 中配置以下前端环境变量：
- `VITE_API_URL` - API 地址（例如：`http://localhost:3000/api`）
- `VITE_SUPABASE_URL` - Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Supabase Anon Key  
- `VITE_AMAP_KEY` - 高德地图 API Key

#### 如果本地构建镜像

使用提供的构建脚本：

```bash
# 确保 frontend/.env 文件存在并配置正确
# 或确保根目录 .env 包含前端环境变量
./build-docker-local.sh
```

或手动构建：

```bash
docker build \
  --build-arg VITE_API_URL="http://localhost:3000/api" \
  --build-arg VITE_SUPABASE_URL="https://your-project.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="your-anon-key" \
  --build-arg VITE_AMAP_KEY="your-amap-key" \
  -t travel-planner:latest \
  .
```

## 步骤 4: 运行容器

### 方式 1: 使用 Docker 命令

```bash
# 运行容器
# 注意：在 Apple Silicon Mac 上，如果镜像是 amd64 架构，需要添加 --platform 参数
docker run -d \
  --name travel-planner \
  --platform linux/amd64 \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest

# 在 Linux amd64 服务器上（不需要 --platform 参数）
# docker run -d \
#   --name travel-planner \
#   -p 3000:3000 \
#   --env-file .env \
#   --restart unless-stopped \
#   crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
```

### 方式 2: 使用 Docker Compose（推荐）

创建 `docker-compose.prod.yml` 文件：

```yaml
version: '3.8'

services:
  travel-planner:
    image: crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
    container_name: travel-planner
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

然后运行：

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 步骤 5: 验证部署

### 检查容器状态

```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker logs travel-planner

# 查看容器健康状态
docker inspect travel-planner | grep Health -A 10
```

### 访问应用

1. **前端**: http://localhost:3000
2. **后端 API**: http://localhost:3000/api
3. **健康检查**: http://localhost:3000/health

### 测试 API

```bash
# 健康检查
curl http://localhost:3000/health

# 应该返回: {"status":"ok"}
```

## 常见问题

### Q: 如何更新镜像？

```bash
# 1. 拉取新版本
docker pull crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest

# 2. 停止并删除旧容器
docker stop travel-planner
docker rm travel-planner

# 3. 使用新镜像启动容器
docker-compose -f docker-compose.prod.yml up -d
```

### Q: 如何查看日志？

```bash
# 实时查看日志
docker logs -f travel-planner

# 查看最近 100 行日志
docker logs --tail 100 travel-planner
```

### Q: 如何进入容器调试？

```bash
# 进入容器
docker exec -it travel-planner sh

# 在容器内查看文件
ls -la /app
ls -la /app/dist
ls -la /app/public
```

### Q: 在 Apple Silicon Mac 上无法拉取镜像？

**A: 使用 --platform 参数**

```bash
# 在 Apple Silicon Mac 上
docker pull --platform linux/amd64 crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest

# 运行容器时也需要指定平台
docker run -d \
  --name travel-planner \
  --platform linux/amd64 \
  -p 3000:3000 \
  --env-file .env \
  crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
```

或者使用 `docker-compose.prod.yml`（已包含 `platform: linux/amd64` 配置）。

### Q: 前端页面无法打开或显示空白？

**A: 检查以下几点**

1. **前端环境变量是否正确构建**
   - 前端环境变量需要在构建时传入，不是运行时
   - 检查构建日志中是否有环境变量相关的错误
   - 如果使用 GitHub Actions 构建，确保配置了 `VITE_*` secrets

2. **检查浏览器控制台**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签是否有 JavaScript 错误
   - 查看 Network 标签，检查 API 请求是否失败

3. **检查 API 地址配置**
   - 前端使用的 API 地址是 `VITE_API_URL`
   - 如果前端构建时 `VITE_API_URL` 是 `http://localhost:3001/api`，但容器运行在 3000 端口，会有问题
   - 解决方案：重新构建镜像，设置 `VITE_API_URL=http://localhost:3000/api`

4. **检查静态文件服务**
   ```bash
   # 检查容器中的静态文件
   docker exec travel-planner ls -la /app/public
   
   # 检查 HTML 文件
   curl http://localhost:3000
   
   # 检查 JavaScript 文件
   curl http://localhost:3000/assets/index-*.js
   ```

5. **重新构建镜像（如果环境变量不正确）**
   ```bash
   # 使用本地构建脚本
   ./build-docker-local.sh
   
   # 或使用 GitHub Actions（需要在 Secrets 中配置前端环境变量）
   ```

### Q: 容器无法启动怎么办？

1. **检查日志**:
   ```bash
   docker logs travel-planner
   ```

2. **检查环境变量**:
   ```bash
   docker exec travel-planner env | grep -E "SUPABASE|DASHSCOPE|PORT"
   ```

3. **检查端口占用**:
   ```bash
   lsof -i :3000
   # 或
   netstat -tulpn | grep 3000
   ```

4. **检查健康状态**:
   ```bash
   docker inspect travel-planner | grep Health
   ```

### Q: 如何备份和恢复？

```bash
# 导出镜像
docker save crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest > travel-planner.tar

# 导入镜像
docker load < travel-planner.tar
```

## 生产环境建议

1. **使用 HTTPS**: 配置反向代理（如 Nginx）并启用 SSL
2. **资源限制**: 在 `docker-compose.prod.yml` 中添加资源限制
3. **日志管理**: 配置日志轮转和集中日志管理
4. **监控**: 配置健康检查和监控告警
5. **备份**: 定期备份数据库和配置文件

## 示例 docker-compose.prod.yml（完整版）

```yaml
version: '3.8'

services:
  travel-planner:
    image: crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
    container_name: travel-planner
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    # 资源限制（可选）
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    # 日志配置（可选）
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 快速验证脚本

创建一个 `verify-deployment.sh` 脚本：

```bash
#!/bin/bash

echo "=== 验证 Docker 部署 ==="

# 检查容器是否运行
if docker ps | grep -q travel-planner; then
    echo "✓ 容器正在运行"
else
    echo "✗ 容器未运行"
    exit 1
fi

# 检查健康状态
HEALTH=$(docker inspect travel-planner --format='{{.State.Health.Status}}' 2>/dev/null)
if [ "$HEALTH" = "healthy" ]; then
    echo "✓ 容器健康状态: $HEALTH"
else
    echo "⚠ 容器健康状态: ${HEALTH:-unknown}"
fi

# 测试健康检查端点
RESPONSE=$(curl -s http://localhost:3000/health)
if echo "$RESPONSE" | grep -q "ok"; then
    echo "✓ 健康检查通过: $RESPONSE"
else
    echo "✗ 健康检查失败: $RESPONSE"
    exit 1
fi

# 检查端口
if netstat -tuln 2>/dev/null | grep -q ":3000 " || ss -tuln 2>/dev/null | grep -q ":3000 "; then
    echo "✓ 端口 3000 正在监听"
else
    echo "✗ 端口 3000 未监听"
    exit 1
fi

echo ""
echo "=== 部署验证完成 ==="
echo "应用地址: http://localhost:3000"
```

使用方法：

```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

