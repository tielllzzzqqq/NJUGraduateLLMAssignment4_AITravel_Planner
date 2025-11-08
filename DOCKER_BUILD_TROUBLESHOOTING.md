# Docker 构建问题排查指南

## 问题: Docker Hub 连接超时

### 错误信息
```
ERROR: failed to solve: node:18-alpine: failed to resolve source metadata for docker.io/library/node:18-alpine: failed to do request: Head "https://registry-1.docker.io/v2/library/node/manifests/18-alpine": net/http: TLS handshake timeout
```

### 原因
1. **网络问题**：无法访问 Docker Hub（registry-1.docker.io）
2. **地区限制**：在中国大陆访问 Docker Hub 可能较慢或不稳定
3. **防火墙/代理**：网络配置阻止了访问

## 解决方案

### 方案 1: 配置 Docker 镜像加速器（推荐）

#### 对于 Docker Desktop (macOS/Windows)

1. 打开 Docker Desktop
2. 进入 Settings → Docker Engine
3. 添加以下配置：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

4. 点击 "Apply & Restart"
5. 重新运行构建命令

#### 对于 Linux

创建或编辑 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

然后重启 Docker：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 方案 2: 使用阿里云容器镜像服务镜像

如果你有阿里云账号，可以使用阿里云的容器镜像服务：

1. 登录阿里云容器镜像服务：https://cr.console.aliyun.com/
2. 获取你的专属镜像加速地址
3. 配置到 Docker 中（同方案 1）

### 方案 3: 使用备用 Dockerfile（使用阿里云镜像源）

如果配置镜像加速器后仍然有问题，可以使用 `Dockerfile.mirror`：

```bash
# 使用备用 Dockerfile（使用阿里云镜像源）
docker build -f Dockerfile.mirror \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --build-arg VITE_AMAP_KEY="$VITE_AMAP_KEY" \
  -t travel-planner:local \
  .
```

**注意**：`Dockerfile.mirror` 使用 `registry.cn-hangzhou.aliyuncs.com/acs/node:18-alpine`，这是阿里云的公共镜像。

### 方案 4: 使用 GitHub Actions 构建（推荐）

如果本地构建遇到网络问题，建议使用 GitHub Actions 自动构建：

1. 在 GitHub Secrets 中配置环境变量
2. 推送代码到 GitHub
3. GitHub Actions 会自动构建并推送到阿里云容器镜像服务
4. 拉取构建好的镜像：

```bash
docker pull crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
```

### 方案 5: 使用代理

如果你有可用的代理：

```bash
# 设置代理环境变量
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port

# 然后运行构建
docker build ...
```

或在 Docker Desktop 中配置代理：
- Settings → Resources → Proxies

## 验证配置

### 检查镜像加速器是否生效

```bash
# 查看 Docker 配置
docker info | grep -i registry

# 或查看 daemon.json
cat /etc/docker/daemon.json  # Linux
# 或在 Docker Desktop 的 Settings → Docker Engine 中查看
```

### 测试拉取镜像

```bash
# 测试拉取一个小的镜像
docker pull alpine:latest

# 如果成功，说明镜像加速器配置正确
```

## 其他常见问题

### 问题: 构建速度慢

**解决方案**：
1. 使用多阶段构建（已实现）
2. 使用构建缓存
3. 使用 `.dockerignore` 排除不必要的文件

### 问题: 构建时 npm 安装失败

**解决方案**：
1. 检查网络连接
2. 配置 npm 镜像源（在 Dockerfile 中添加）：
   ```dockerfile
   RUN npm config set registry https://registry.npmmirror.com
   ```

### 问题: 构建时内存不足

**解决方案**：
1. 增加 Docker Desktop 的内存分配
2. 清理 Docker 缓存：
   ```bash
   docker system prune -a
   ```

## 推荐工作流程

1. **开发环境**：使用 GitHub Actions 自动构建
2. **本地测试**：配置 Docker 镜像加速器后本地构建
3. **生产环境**：使用 GitHub Actions 构建的镜像

## 快速修复命令

```bash
# 1. 配置镜像加速器（macOS/Windows - Docker Desktop）
# 在 Docker Desktop Settings → Docker Engine 中添加 registry-mirrors

# 2. 重启 Docker
# Docker Desktop: 点击 Restart
# Linux: sudo systemctl restart docker

# 3. 验证配置
docker info | grep -i registry

# 4. 重新构建
docker build \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --build-arg VITE_AMAP_KEY="$VITE_AMAP_KEY" \
  -t travel-planner:local \
  .
```

## 获取帮助

如果问题仍然存在：

1. 检查网络连接
2. 查看 Docker 日志：`docker logs <container-id>`
3. 查看构建日志：`docker build ... 2>&1 | tee build.log`
4. 检查防火墙设置
5. 尝试使用 GitHub Actions 构建（推荐）

