# 项目配置清单

## 📋 配置步骤概览

按照以下步骤配置项目，让应用正常运行。

---

## 1. GitHub 仓库设置

### 创建并推送代码

1. **在 GitHub 上创建新仓库**
   - 访问 https://github.com/new
   - 仓库名称：`travel-planner` 或自定义
   - 选择 Public 或 Private
   - **不要**初始化 README、.gitignore 或 license（我们已经有了）

2. **添加远程仓库并推送**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

3. **更新文档中的仓库地址**
   - 更新 `README.md` 中的 GitHub 地址
   - 更新 `PROJECT_SUBMISSION.md` 中的 GitHub 地址

---

## 2. Supabase 配置（必需）

### 步骤

1. **创建 Supabase 项目**
   - 访问 https://supabase.com
   - 注册/登录账户
   - 点击 "New Project"
   - 填写项目信息（名称、数据库密码、区域）

2. **获取 API 密钥**
   - 进入项目后，点击 Settings > API
   - 复制以下信息：
     - `Project URL` → `SUPABASE_URL`
     - `anon public` key → `SUPABASE_ANON_KEY`
     - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

3. **初始化数据库**
   - 在 Supabase 项目中，点击左侧 "SQL Editor"
   - 点击 "New query"
   - 复制 `database/schema.sql` 的全部内容
   - 粘贴到 SQL Editor 并点击 "Run"
   - 确认表创建成功（应看到 `travel_plans` 和 `expenses` 表）

4. **验证 RLS 策略**
   - 在 SQL Editor 中运行：
     ```sql
     SELECT * FROM pg_policies WHERE tablename IN ('travel_plans', 'expenses');
     ```
   - 应该看到 8 条策略（每个表 4 条）

### 环境变量配置

在项目根目录创建 `.env` 文件：
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

在 `frontend/.env` 文件中：
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. 阿里云百炼平台配置（必需）

### 步骤

1. **获取 API Key**
   - 访问 https://dashscope.aliyun.com/
   - 登录阿里云账户
   - 进入 "API-KEY 管理"
   - 创建新的 API Key 或使用现有 Key
   - 复制 API Key（注意：新版本使用 API Key，不再是 AccessKey ID/Secret）

2. **验证服务可用性**
   - 确保账户有足够的余额
   - 检查服务是否已开通（通义千问模型）

### 环境变量配置

在项目根目录的 `.env` 文件中添加：
```bash
# 阿里云百炼平台 API Key（新版本）
DASHSCOPE_API_KEY=your_api_key_here

# Base URL（可选，默认使用中国地域）
# 中国地域：https://dashscope.aliyuncs.com/compatible-mode/v1
# 新加坡地域：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型名称（可选，默认 qwen-plus）
# 可选：qwen-plus, qwen-turbo, qwen-max 等
DASHSCOPE_MODEL=qwen-plus
```

**重要提示：**
- 新版本使用 API Key 方式（兼容 OpenAI 格式）
- Base URL 使用 `/compatible-mode/v1` 路径
- 不再需要 AccessKey ID 和 Secret

**重要提示：**
- 请确保 API Key 至少 3 个月内有效（供助教批改）
- 如果使用您提供的 Key，请在 README.md 中更新实际密钥
- 不要将密钥提交到 GitHub

---

## 4. 高德地图配置（必需）

### 步骤

1. **注册并创建应用**
   - 访问 https://lbs.amap.com/
   - 注册/登录账户
   - 进入控制台
   - 点击 "应用管理" > "我的应用" > "创建新应用"
   - 应用名称：`AI旅行规划助手`

2. **添加 Key**
   - 在应用下点击 "添加"
   - Key 名称：`Web服务Key`
   - 服务平台：选择 "Web服务"
   - 点击 "提交"
   - 复制生成的 Key

3. **配置安全设置（可选但推荐）**
   - 在 Key 设置中，可以配置白名单 IP 或域名
   - 开发阶段可以暂时不设置

### 环境变量配置

在项目根目录的 `.env` 文件中：
```bash
AMAP_WEB_KEY=your_amap_web_key_here
```

在 `frontend/.env` 文件中：
```bash
VITE_AMAP_KEY=your_amap_web_key_here
```

---

## 5. 科大讯飞配置（可选）

### 步骤

如果使用后端语音识别（前端主要使用 Web Speech API）：

1. **注册并创建应用**
   - 访问 https://www.xfyun.cn/
   - 注册/登录账户
   - 进入控制台
   - 创建新应用
   - 选择 "语音听写" 服务

2. **获取凭证**
   - 复制 `APPID`
   - 复制 `API Key`
   - 复制 `API Secret`

### 环境变量配置

在项目根目录的 `.env` 文件中：
```bash
XUNFEI_APP_ID=your_app_id
XUNFEI_API_KEY=your_api_key
XUNFEI_API_SECRET=your_api_secret
```

**注意：** 前端主要使用浏览器的 Web Speech API，此配置为可选。

---

## 6. 前端环境变量完整配置

创建 `frontend/.env` 文件：
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001/api
VITE_AMAP_KEY=your_amap_web_key
```

**生产环境：**
```bash
VITE_API_URL=https://your-domain.com/api
```

---

## 7. 安装依赖并启动

### 安装依赖
```bash
npm run install:all
```

### 启动开发服务器
```bash
npm run dev
```

前端访问：http://localhost:3000  
后端API：http://localhost:3001

---

## 8. GitHub Actions 配置（可选，用于自动构建 Docker 镜像）

### 步骤

1. **配置 GitHub Secrets**
   - 进入 GitHub 仓库
   - Settings > Secrets and variables > Actions
   - 添加以下 Secrets：
     - `ALIBABA_CLOUD_USERNAME`: 阿里云容器镜像服务用户名
     - `ALIBABA_CLOUD_PASSWORD`: 阿里云容器镜像服务密码
     - `ALIBABA_CLOUD_NAMESPACE`: 阿里云容器镜像服务命名空间

2. **验证工作流**
   - 推送代码到 main/master 分支
   - 在 GitHub 仓库的 Actions 标签页查看构建状态

---

## 9. Docker 部署配置（可选）

### 本地构建和运行

```bash
# 构建镜像
docker build -t travel-planner .

# 运行容器
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name travel-planner \
  travel-planner
```

### 从阿里云拉取镜像

```bash
# 登录
docker login --username=your_username registry.cn-hangzhou.aliyuncs.com

# 拉取
docker pull registry.cn-hangzhou.aliyuncs.com/your_namespace/travel-planner:latest

# 运行
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name travel-planner \
  registry.cn-hangzhou.aliyuncs.com/your_namespace/travel-planner:latest
```

---

## ✅ 配置检查清单

完成以下检查，确保所有配置正确：

- [ ] GitHub 仓库已创建并推送代码
- [ ] Supabase 项目已创建
- [ ] Supabase 数据库表已创建（执行 schema.sql）
- [ ] Supabase API 密钥已配置
- [ ] 阿里云百炼平台 API Key 已配置
- [ ] 高德地图 API Key 已配置
- [ ] 前端环境变量已配置（frontend/.env）
- [ ] 后端环境变量已配置（.env）
- [ ] 依赖已安装（npm run install:all）
- [ ] 开发服务器可以启动（npm run dev）
- [ ] 可以注册新用户
- [ ] 可以创建旅行计划
- [ ] 地图可以正常显示
- [ ] 语音输入可以工作（Chrome/Edge浏览器）

---

## 🐛 常见问题排查

### 1. 数据库连接失败
- 检查 Supabase URL 和 Key 是否正确
- 确认 RLS 策略已正确配置
- 检查网络连接

### 2. 地图不显示
- 检查高德地图 API Key 是否正确
- 检查浏览器控制台错误
- 确认 API Key 有 Web 服务权限

### 3. AI 生成计划失败
- 检查阿里云百炼平台 API Key
- 确认账户有足够余额
- 查看后端日志错误信息

### 4. 语音识别不工作
- 使用 Chrome 或 Edge 浏览器
- 检查浏览器权限设置
- 确认使用 HTTPS 或 localhost

### 5. 前端无法连接后端
- 检查 `VITE_API_URL` 配置
- 确认后端服务正在运行
- 检查 CORS 设置

---

## 📝 下一步

配置完成后：
1. 测试所有功能
2. 更新 README.md 中的实际 API 密钥（如果需要）
3. 生成 PDF 提交文档
4. 准备演示

---

**配置完成后，项目应该可以正常运行！** 🎉

