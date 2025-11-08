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
docker pull crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest

# 或者拉取特定版本（使用 commit SHA）
docker pull crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:157dbf8ee34c42b60d1c4b6ac691aaf379c876b1
```

## 步骤 3: 配置环境变量

创建 `.env` 文件（如果还没有）：

```bash
# 复制示例文件（如果存在）
# cp .env.example .env

# 编辑 .env 文件
# nano .env
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
VITE_AMAP_KEY=your-amap-key
```

> **注意**：`VITE_AMAP_KEY` 是前端环境变量，但在 Docker 镜像中已经构建进去了。如果需要更新，需要重新构建镜像。

## 步骤 4: 运行容器

### 方式 1: 使用 Docker 命令

```bash
# 运行容器
docker run -d \
  --name travel-planner \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
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

