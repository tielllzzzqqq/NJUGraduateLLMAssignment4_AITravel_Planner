# Docker 故障排查指南

## 常见问题

### 1. Docker daemon 未运行

**错误信息：**
```
Cannot connect to the Docker daemon at unix:///Users/username/.docker/run/docker.sock. 
Is the docker daemon running?
```

**解决方案：**

#### macOS

1. **启动 Docker Desktop**
   ```bash
   # 方式 1: 使用命令行
   open -a Docker
   
   # 方式 2: 使用 Spotlight
   # 按 Cmd + Space，输入 "Docker"，回车
   
   # 方式 3: 从应用程序启动
   # Finder → 应用程序 → Docker Desktop
   ```

2. **等待启动完成**
   - 等待菜单栏出现 Docker 图标（ whale 图标）
   - 图标停止动画表示启动完成
   - 通常需要 10-30 秒

3. **验证启动**
   ```bash
   docker info
   # 或
   docker ps
   ```

4. **使用帮助脚本**
   ```bash
   ./start-docker.sh
   ```

#### Linux

```bash
# 启动 Docker 服务
sudo systemctl start docker

# 设置开机自启
sudo systemctl enable docker

# 验证
sudo systemctl status docker
```

#### Windows

1. 打开 Docker Desktop 应用
2. 等待 Docker Desktop 启动完成
3. 验证：`docker ps`

### 2. 权限错误

**错误信息：**
```
permission denied while trying to connect to the Docker daemon socket
```

**解决方案：**

#### macOS/Windows
- 使用 Docker Desktop，通常不需要额外权限配置

#### Linux
```bash
# 将用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker

# 验证
docker ps
```

### 3. 无法连接到 Docker Hub

**错误信息：**
```
Error response from daemon: Get https://registry-1.docker.io/v2/: net/http: request canceled
```

**解决方案：**

1. **检查网络连接**
   ```bash
   ping registry-1.docker.io
   ```

2. **配置镜像加速器（中国用户）**
   
   在 Docker Desktop 中：
   - Settings → Docker Engine
   - 添加以下配置：
   ```json
   {
     "registry-mirrors": [
       "https://docker.mirrors.ustc.edu.cn",
       "https://hub-mirror.c.163.com"
     ]
   }
   ```
   - 点击 "Apply & Restart"

3. **使用代理（如果需要）**
   - Settings → Resources → Proxies
   - 配置 HTTP/HTTPS 代理

### 4. 磁盘空间不足

**错误信息：**
```
no space left on device
```

**解决方案：**

1. **清理未使用的资源**
   ```bash
   # 清理未使用的容器、网络、镜像
   docker system prune -a
   
   # 清理构建缓存
   docker builder prune -a
   ```

2. **查看磁盘使用**
   ```bash
   docker system df
   ```

3. **在 Docker Desktop 中清理**
   - Settings → Resources → Advanced
   - 调整磁盘镜像大小
   - 或使用 "Clean / Purge data"

### 5. 端口被占用

**错误信息：**
```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**解决方案：**

1. **查找占用端口的进程**
   ```bash
   # macOS/Linux
   lsof -i :3000
   # 或
   netstat -tulpn | grep 3000
   
   # 杀死进程
   kill -9 <PID>
   ```

2. **修改端口映射**
   ```bash
   # 在 docker-compose.yml 中修改
   ports:
     - "3001:3000"  # 使用 3001 端口
   ```

### 6. 镜像拉取失败

**错误信息：**
```
Error response from daemon: pull access denied
```

**解决方案：**

1. **检查是否已登录**
   ```bash
   docker login crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com
   ```

2. **检查镜像地址是否正确**
   ```bash
   # 确认镜像地址格式
   docker pull crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
   ```

3. **检查网络连接**
   ```bash
   ping crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com
   ```

### 7. 容器无法启动

**检查步骤：**

1. **查看日志**
   ```bash
   docker logs travel-planner
   docker logs -f travel-planner  # 实时日志
   ```

2. **检查环境变量**
   ```bash
   docker exec travel-planner env
   ```

3. **检查容器状态**
   ```bash
   docker ps -a
   docker inspect travel-planner
   ```

4. **进入容器调试**
   ```bash
   docker exec -it travel-planner sh
   ```

### 8. 健康检查失败

**检查步骤：**

1. **检查应用是否运行**
   ```bash
   docker exec travel-planner ps aux
   ```

2. **检查端口**
   ```bash
   docker exec travel-planner netstat -tuln
   ```

3. **手动测试健康端点**
   ```bash
   docker exec travel-planner wget -q -O- http://localhost:3000/health
   # 或
   curl http://localhost:3000/health
   ```

## 快速诊断脚本

运行诊断脚本检查常见问题：

```bash
#!/bin/bash
echo "=== Docker 诊断 ==="

# 检查 Docker 安装
if command -v docker &> /dev/null; then
    echo "✓ Docker 已安装: $(docker --version)"
else
    echo "❌ Docker 未安装"
    exit 1
fi

# 检查 Docker daemon
if docker info >/dev/null 2>&1; then
    echo "✓ Docker daemon 正在运行"
    echo "  Docker 版本: $(docker info --format '{{.ServerVersion}}' 2>/dev/null)"
else
    echo "❌ Docker daemon 未运行"
    echo "  请运行: ./start-docker.sh"
    exit 1
fi

# 检查磁盘空间
echo ""
echo "=== 磁盘使用 ==="
docker system df

# 检查运行中的容器
echo ""
echo "=== 运行中的容器 ==="
docker ps

# 检查镜像
echo ""
echo "=== 本地镜像 ==="
docker images | grep travel-planner

echo ""
echo "=== 诊断完成 ==="
```

## 获取帮助

如果以上方法都无法解决问题：

1. **查看 Docker 日志**
   - macOS: `~/Library/Containers/com.docker.docker/Data/log/`
   - Linux: `/var/log/docker.log`
   - Windows: `%LOCALAPPDATA%\Docker\log\`

2. **重启 Docker Desktop**
   - 完全退出 Docker Desktop
   - 重新启动

3. **重新安装 Docker Desktop**
   - 卸载 Docker Desktop
   - 下载最新版本重新安装

4. **查看官方文档**
   - https://docs.docker.com/desktop/troubleshoot/

