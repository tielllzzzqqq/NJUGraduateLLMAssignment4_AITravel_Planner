# Docker 镜像部署验证流程

本文档提供完整的 Docker 镜像部署验证步骤。

## 快速验证

运行快速验证脚本：

```bash
./quick-verify.sh
```

## 完整验证流程

### 步骤 1: 启动 Docker Desktop

```bash
# 运行启动脚本（会自动检测并启动 Docker Desktop）
./start-docker.sh

# 或手动启动
open -a Docker
```

等待 Docker Desktop 完全启动（菜单栏出现 Docker 图标）。

### 步骤 2: 登录阿里云容器镜像服务

```bash
docker login crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com

# 输入用户名: aliyun4681828459
# 输入密码: 你的 Docker 登录密码
```

### 步骤 3: 拉取 Docker 镜像

```bash
# 在 Apple Silicon Mac 上（需要指定平台）
docker pull --platform linux/amd64 crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest

# 在 Linux amd64 服务器上
# docker pull crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
```

验证镜像已拉取：

```bash
docker images | grep travel_planner
```

### 步骤 4: 配置环境变量

确保 `.env` 文件已配置所有必需的环境变量：

```env
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 后端配置
PORT=3000
NODE_ENV=production
JWT_SECRET=your-jwt-secret

# 阿里云 DashScope API
DASHSCOPE_API_KEY=your-dashscope-api-key

# 高德地图 API（在 Docker 镜像中已构建）
VITE_AMAP_KEY=your-amap-key
```

检查环境变量：

```bash
# 检查 .env 文件是否存在
ls -la .env

# 检查必需的环境变量（不显示实际值）
grep -E "SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|DASHSCOPE_API_KEY|PORT" .env | sed 's/=.*/=***/'
```

### 步骤 5: 启动容器

使用 Docker Compose（推荐）：

```bash
docker-compose -f docker-compose.prod.yml up -d
```

或使用 Docker 命令：

```bash
docker run -d \
  --name travel-planner \
  --platform linux/amd64 \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
```

### 步骤 6: 验证部署

运行验证脚本：

```bash
./verify-deployment.sh
```

或手动验证：

```bash
# 1. 检查容器状态
docker ps | grep travel-planner

# 2. 检查健康状态
docker inspect travel-planner --format='{{.State.Health.Status}}'

# 3. 测试健康检查端点
curl http://localhost:3000/health

# 4. 查看日志
docker logs travel-planner

# 5. 检查环境变量
docker exec travel-planner env | grep -E "SUPABASE|DASHSCOPE|PORT|NODE_ENV"
```

### 步骤 7: 访问应用

1. **前端**: http://localhost:3000
2. **后端 API**: http://localhost:3000/api
3. **健康检查**: http://localhost:3000/health

## 验证清单

- [ ] Docker Desktop 已启动
- [ ] 已登录阿里云容器镜像服务
- [ ] 镜像已成功拉取
- [ ] `.env` 文件已配置所有必需变量
- [ ] 容器已启动并运行
- [ ] 健康检查通过（`/health` 返回 `{"status":"ok"}`）
- [ ] 可以访问 http://localhost:3000
- [ ] 日志中没有错误信息
- [ ] 环境变量正确加载

## 常见问题

### Q: 在 Apple Silicon Mac 上无法拉取镜像？

**A:** 使用 `--platform linux/amd64` 参数：

```bash
docker pull --platform linux/amd64 crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
```

### Q: 容器无法启动？

**检查步骤：**

1. 查看日志：
   ```bash
   docker logs travel-planner
   ```

2. 检查环境变量：
   ```bash
   docker exec travel-planner env | grep -E "SUPABASE|DASHSCOPE"
   ```

3. 检查端口占用：
   ```bash
   lsof -i :3000
   ```

### Q: 健康检查失败？

**检查步骤：**

1. 检查应用是否运行：
   ```bash
   docker exec travel-planner ps aux | grep node
   ```

2. 手动测试健康端点：
   ```bash
   docker exec travel-planner wget -q -O- http://localhost:3000/health
   ```

3. 查看详细日志：
   ```bash
   docker logs -f travel-planner
   ```

## 完整测试流程

```bash
# 1. 启动 Docker
./start-docker.sh

# 2. 登录阿里云
docker login crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com

# 3. 拉取镜像
docker pull --platform linux/amd64 crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest

# 4. 快速验证
./quick-verify.sh

# 5. 启动容器
docker-compose -f docker-compose.prod.yml up -d

# 6. 验证部署
./verify-deployment.sh

# 7. 访问应用
open http://localhost:3000
```

## 下一步

部署成功后，你可以：

1. **测试功能**
   - 注册/登录用户
   - 创建旅行计划
   - 查看地图显示
   - 记录费用

2. **监控应用**
   - 查看日志：`docker logs -f travel-planner`
   - 检查健康状态：`docker inspect travel-planner --format='{{.State.Health.Status}}'`

3. **更新应用**
   - 拉取新镜像：`docker pull --platform linux/amd64 ...`
   - 重启容器：`docker-compose -f docker-compose.prod.yml restart`

## 相关文档

- **DOCKER_DEPLOY.md** - 详细部署指南
- **DOCKER_TROUBLESHOOTING.md** - 故障排查指南
- **DOCKER_SETUP.md** - GitHub Actions 配置指南

