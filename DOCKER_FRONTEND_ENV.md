# Docker 前端环境变量配置指南

## 问题说明

前端环境变量（`VITE_*`）需要在 **构建 Docker 镜像时** 传入，不能在运行时通过 `.env` 文件修改。

这是因为 Vite 在构建时会将 `import.meta.env.VITE_*` 替换为实际值，这些值被硬编码到构建产物中。

## 配置方式

### 方式 1: 在 GitHub Secrets 中配置（推荐）

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中配置以下 Secrets：

1. **VITE_SUPABASE_URL**
   - 你的 Supabase 项目 URL
   - 例如：`https://xxxxx.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - 你的 Supabase Anon Key
   - 从 Supabase 控制台获取

3. **VITE_AMAP_KEY**
   - 你的高德地图 API Key
   - 从高德开放平台获取

4. **VITE_API_URL**（可选）
   - 默认已设置为 `/api`（相对路径）
   - 前后端在同一容器，使用相对路径即可

### 方式 2: 本地构建 Docker 镜像

如果你想在本地构建并测试，可以使用以下命令：

```bash
# 构建镜像时传入环境变量
docker build \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key \
  --build-arg VITE_AMAP_KEY=your-amap-key \
  -t travel-planner:local \
  .
```

### 方式 3: 使用 .env 文件（仅用于本地开发）

在本地开发时，可以在 `frontend/.env` 文件中配置：

```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AMAP_KEY=your-amap-key
```

**注意**：这个文件只在本地开发时使用，不会被打包到 Docker 镜像中。

## 验证配置

### 检查当前运行的镜像

```bash
# 检查容器中的前端构建产物
docker exec travel-planner cat /app/public/index.html

# 检查前端 JavaScript 文件中的环境变量（如果可见）
docker exec travel-planner sh -c "find /app/public/assets -name '*.js' | head -1 | xargs grep -o 'localhost:3001\|/api' | head -5"
```

### 检查浏览器控制台

打开 `http://localhost:3000`，按 F12 打开开发者工具，查看：

1. **Console 标签**：检查是否有错误
2. **Network 标签**：检查 API 请求是否发送到正确的 URL（应该是 `/api/...`）

## 常见问题

### 1. 前端无法加载

**原因**：前端环境变量未在构建时设置。

**解决方案**：
- 重新构建 Docker 镜像，传入正确的构建参数
- 或者在 GitHub Secrets 中配置环境变量，触发 GitHub Actions 重新构建

### 2. API 请求失败

**原因**：前端 API URL 配置错误。

**解决方案**：
- 确保 `VITE_API_URL=/api`（相对路径）
- 检查后端是否正确提供 `/api` 路由

### 3. Supabase 认证失败

**原因**：`VITE_SUPABASE_URL` 或 `VITE_SUPABASE_ANON_KEY` 未设置或错误。

**解决方案**：
- 在 GitHub Secrets 中配置正确的值
- 重新构建 Docker 镜像

### 4. 地图无法加载

**原因**：`VITE_AMAP_KEY` 未设置或错误。

**解决方案**：
- 在 GitHub Secrets 中配置高德地图 API Key
- 重新构建 Docker 镜像

## 重新构建镜像

### 使用 GitHub Actions（推荐）

1. 在 GitHub Secrets 中配置环境变量
2. 推送代码到 main/master 分支
3. GitHub Actions 会自动构建并推送新镜像
4. 拉取新镜像并重启容器：

```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 本地构建

```bash
# 停止并删除旧容器
docker-compose -f docker-compose.prod.yml down

# 构建新镜像
docker build \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  --build-arg VITE_AMAP_KEY=$VITE_AMAP_KEY \
  -t travel-planner:local \
  .

# 更新 docker-compose.prod.yml 使用本地镜像
# 然后启动容器
docker-compose -f docker-compose.prod.yml up -d
```

## 总结

- ✅ 前端环境变量在构建时嵌入，运行时无法修改
- ✅ 在 GitHub Secrets 中配置环境变量，让 GitHub Actions 自动构建
- ✅ 使用相对路径 `/api` 访问后端 API
- ✅ 确保后端环境变量通过 `.env` 文件在运行时注入
- ✅ 重新构建镜像后，拉取新镜像并重启容器

