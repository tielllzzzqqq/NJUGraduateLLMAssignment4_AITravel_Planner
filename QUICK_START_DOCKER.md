# Docker 快速开始指南

## 问题：Docker Hub 连接超时

如果遇到 `TLS handshake timeout` 或 `failed to resolve source metadata` 错误，请按照以下步骤操作。

## 解决方案（按推荐顺序）

### 🎯 方案 1: 使用 GitHub Actions 构建（最推荐）

**优点**：无需配置本地网络，自动构建并推送到阿里云镜像服务

1. **配置 GitHub Secrets**（如果还没配置）：
   - 访问：https://github.com/tielllzzzqqq/NJUGraduateLLMAssignment4_AITravel_Planner/settings/secrets/actions
   - 添加以下 Secrets：
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_AMAP_KEY`
     - `ALIBABA_CLOUD_USERNAME`
     - `ALIBABA_CLOUD_PASSWORD`

2. **触发构建**：
   - 代码已自动推送，GitHub Actions 会自动构建
   - 或手动触发：Actions → Build and Push Docker Image → Run workflow

3. **拉取并运行**：
   ```bash
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

### 🔧 方案 2: 配置 Docker 镜像加速器（本地构建）

**步骤**：

1. **打开 Docker Desktop** → Settings → Docker Engine

2. **添加镜像加速器配置**（保留现有配置）：
   ```json
   {
     "registry-mirrors": [
       "https://docker.mirrors.ustc.edu.cn",
       "https://hub-mirror.c.163.com",
       "https://mirror.baidubce.com"
     ]
   }
   ```

3. **点击 "Apply & Restart"**

4. **验证配置**：
   ```bash
   docker info | grep -A 5 'Registry Mirrors'
   ```

5. **构建镜像**：
   ```bash
   # 使用构建脚本（推荐）
   ./build-with-mirror.sh
   
   # 或手动构建
   source .env
   docker build \
     --build-arg VITE_API_URL=/api \
     --build-arg VITE_SUPABASE_URL="$SUPABASE_URL" \
     --build-arg VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
     --build-arg VITE_AMAP_KEY="$VITE_AMAP_KEY" \
     -t travel-planner:local \
     .
   ```

### 🚀 方案 3: 使用脚本自动配置（macOS）

运行配置脚本：
```bash
./setup-docker-mirror.sh
```

然后按照脚本提示在 Docker Desktop 中配置。

## 验证构建

### 检查镜像加速器配置

```bash
docker info | grep -A 5 'Registry Mirrors'
```

应该看到类似输出：
```
Registry Mirrors:
 https://docker.mirrors.ustc.edu.cn/
 https://hub-mirror.c.163.com/
 https://mirror.baidubce.com/
```

### 测试拉取镜像

```bash
# 测试拉取一个小镜像
docker pull alpine:latest
```

如果成功，说明镜像加速器配置正确。

### 构建镜像

```bash
# 使用构建脚本
./build-with-mirror.sh

# 或手动构建
source .env
docker build \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_SUPABASE_URL="$SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --build-arg VITE_AMAP_KEY="$VITE_AMAP_KEY" \
  -t travel-planner:local \
  .
```

## 运行容器

### 使用 GitHub Actions 构建的镜像（推荐）

```bash
# 拉取镜像
docker-compose -f docker-compose.prod.yml pull

# 启动容器
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker logs -f travel-planner

# 检查状态
./check-container.sh
```

### 使用本地构建的镜像

```bash
# 修改 docker-compose.prod.yml，将 image 改为：
# image: travel-planner:local

# 启动容器
docker-compose -f docker-compose.prod.yml up -d
```

## 常见问题

### Q: 配置镜像加速器后仍然超时？

**A**: 尝试以下方法：
1. 检查网络连接
2. 尝试不同的镜像加速器地址
3. 使用 GitHub Actions 构建（推荐）
4. 检查防火墙设置

### Q: 如何获取阿里云专属镜像加速地址？

**A**:
1. 访问：https://cr.console.aliyun.com/cn-hangzhou/instances/mirrors
2. 登录阿里云账号
3. 获取你的专属加速地址
4. 添加到 `registry-mirrors` 中

### Q: 构建速度很慢？

**A**:
1. 确保配置了镜像加速器
2. 使用 GitHub Actions 构建（云端构建，速度更快）
3. 清理 Docker 缓存：`docker system prune -a`

## 推荐工作流程

1. **开发阶段**：使用 GitHub Actions 自动构建
2. **本地测试**：配置镜像加速器后本地构建
3. **生产部署**：使用 GitHub Actions 构建的镜像

## 获取帮助

如果问题仍然存在：

1. 查看详细文档：`DOCKER_BUILD_TROUBLESHOOTING.md`
2. 检查 Docker 日志：`docker logs <container-id>`
3. 查看构建日志：`docker build ... 2>&1 | tee build.log`
4. 使用 GitHub Actions 构建（最可靠）

