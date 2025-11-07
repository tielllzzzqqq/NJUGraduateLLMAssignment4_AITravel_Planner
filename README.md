# AI旅行规划助手

一个基于AI的智能旅行规划Web应用，通过语音和文字输入，自动生成详细的旅行路线和建议，并提供实时旅行辅助。

## 功能特性

### 核心功能

1. **智能行程规划**
   - 支持语音和文字输入旅行需求
   - AI自动生成个性化旅行路线
   - 包含交通、住宿、景点、餐厅等详细信息
   - 基于地图的可视化展示

2. **费用预算与管理**
   - AI进行预算分析和估算
   - 实时记录旅行开销
   - 支持语音输入费用记录
   - 费用分类统计和预算追踪

3. **用户管理与数据存储**
   - 完整的注册登录系统
   - 云端行程同步
   - 多设备访问支持
   - 数据安全保护

## 技术栈

### 前端
- **React 18** + **TypeScript** - 现代化前端框架
- **Vite** - 快速构建工具
- **React Router** - 路由管理
- **高德地图 API** - 地图展示和导航
- **Web Speech API** - 浏览器语音识别

### 后端
- **Node.js** + **Express** + **TypeScript** - 后端服务
- **Supabase** - 数据库和用户认证
- **阿里云百炼平台** - 大语言模型API
- **科大讯飞** - 语音识别API（可选，前端主要使用Web Speech API）

### 部署
- **Docker** - 容器化部署
- **GitHub Actions** - CI/CD自动化
- **阿里云容器镜像服务** - 镜像存储

## 项目结构

```
.
├── backend/              # 后端服务
│   ├── src/
│   │   ├── routes/      # API路由
│   │   ├── services/    # 业务逻辑服务
│   │   ├── config/      # 配置文件
│   │   └── server.ts    # 服务器入口
│   └── package.json
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 可复用组件
│   │   ├── api/         # API客户端
│   │   └── App.tsx      # 应用入口
│   └── package.json
├── database/            # 数据库脚本
│   └── schema.sql      # 数据库表结构
├── .github/workflows/   # GitHub Actions
├── Dockerfile          # Docker构建文件
├── docker-compose.yml  # Docker Compose配置
└── README.md          # 项目文档
```

## 环境配置

### 必需的环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
# Backend Port
PORT=3001

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 科大讯飞语音识别（可选）
XUNFEI_APP_ID=your_xunfei_app_id
XUNFEI_API_KEY=your_xunfei_api_key
XUNFEI_API_SECRET=your_xunfei_api_secret

# 高德地图
AMAP_WEB_KEY=your_amap_web_key

# 阿里云百炼平台
ALIBABA_CLOUD_ACCESS_KEY_ID=your_access_key_id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_access_key_secret
ALIBABA_CLOUD_ENDPOINT=dashscope.aliyuncs.com
```

### 前端环境变量

创建 `frontend/.env` 文件：

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001/api
VITE_AMAP_KEY=your_amap_web_key
```

## API密钥配置说明

### 1. Supabase 配置

1. 访问 [Supabase](https://supabase.com) 创建项目
2. 在项目设置中获取：
   - Project URL (`SUPABASE_URL`)
   - Anon Key (`SUPABASE_ANON_KEY`)
   - Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)
3. 在SQL编辑器中执行 `database/schema.sql` 创建表结构

### 2. 阿里云百炼平台配置

**重要：API密钥配置说明**

1. 访问 [阿里云百炼平台](https://dashscope.aliyun.com/)
2. 登录后进入 "API-KEY 管理"
3. 创建新的 API Key 或使用现有 Key
4. 复制 API Key

请在 `.env` 文件中配置以下环境变量：

```
# 阿里云百炼平台 API Key（新版本使用）
DASHSCOPE_API_KEY=your_api_key_here

# Base URL（可选，默认使用中国地域）
# 中国地域：https://dashscope.aliyuncs.com/compatible-mode/v1
# 新加坡地域：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型名称（可选，默认使用 qwen-plus）
# 可选模型：qwen-plus, qwen-turbo, qwen-max 等
DASHSCOPE_MODEL=qwen-plus
```

**注意：** 
- 新版本使用 API Key 方式，不再需要 AccessKey ID 和 Secret
- Base URL 使用兼容 OpenAI 的格式：`/compatible-mode/v1`
- 确保 API Key 至少 3 个月内有效（供助教批改使用）



### 3. 高德地图配置

1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 创建应用并获取 Web 服务 Key
3. 配置到环境变量 `AMAP_WEB_KEY`

### 4. 科大讯飞配置

1. 访问 [科大讯飞开放平台](https://www.xfyun.cn/)
2. 创建应用获取 AppID、API Key 和 API Secret
3. 配置到环境变量（如果使用后端语音识别）

## 本地开发

### 前置要求

- Node.js 18+
- npm 或 yarn
- Docker（可选，用于数据库）

### 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或分别安装
cd backend && npm install
cd ../frontend && npm install
```

### 启动开发服务器

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:backend  # 后端运行在 http://localhost:3001
npm run dev:frontend # 前端运行在 http://localhost:3000
```

### 数据库初始化

1. 在 Supabase 项目中打开 SQL 编辑器
2. 执行 `database/schema.sql` 中的 SQL 语句
3. 确保 Row Level Security (RLS) 策略已正确配置

## Docker 部署

### 构建镜像

```bash
docker build -t travel-planner .
```

### 运行容器

```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name travel-planner \
  travel-planner
```

### 使用 Docker Compose

```bash
docker-compose up -d
```

## 从阿里云镜像仓库拉取镜像

```bash
# 登录阿里云容器镜像服务
docker login --username=your_username registry.cn-hangzhou.aliyuncs.com

# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your_namespace/travel-planner:latest

# 运行容器
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name travel-planner \
  registry.cn-hangzhou.aliyuncs.com/your_namespace/travel-planner:latest
```

## 生产环境部署

### 使用 Docker

1. 确保所有环境变量已正确配置
2. 构建或拉取 Docker 镜像
3. 运行容器并映射端口
4. 配置反向代理（如 Nginx）处理 HTTPS

### 环境变量管理

**重要：** 生产环境中，请使用以下方式管理敏感信息：
- Docker secrets
- Kubernetes secrets
- 环境变量注入
- 配置管理服务

**不要将 API 密钥硬编码在代码中！**

## API 文档

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 旅行计划

- `POST /api/travel/plan` - 创建旅行计划
- `GET /api/travel/plans` - 获取所有计划
- `GET /api/travel/plans/:id` - 获取单个计划
- `PUT /api/travel/plans/:id` - 更新计划
- `DELETE /api/travel/plans/:id` - 删除计划
- `POST /api/travel/estimate-budget` - 估算预算

### 费用管理

- `POST /api/expense/expenses` - 添加费用记录
- `GET /api/expense/expenses/:travelPlanId` - 获取费用列表
- `PUT /api/expense/expenses/:id` - 更新费用记录
- `DELETE /api/expense/expenses/:id` - 删除费用记录

### 语音识别

- `POST /api/voice/recognize` - 语音识别（上传音频文件）
- `GET /api/voice/status` - 获取语音识别状态

## 使用说明

### 创建旅行计划

1. 注册/登录账户
2. 点击"创建新计划"
3. 使用语音或文字输入：
   - 目的地（如：日本、北京）
   - 天数（如：5天）
   - 预算（如：1万元）
   - 同行人数
   - 旅行偏好（如：喜欢美食和动漫，带孩子）
4. 点击"生成旅行计划"
5. AI将自动生成详细的行程安排

### 查看和管理计划

- 在仪表板查看所有计划
- 点击计划查看详细信息
- 在地图上查看路线
- 跟踪费用支出

### 费用管理

- 在计划详情页添加费用记录
- 支持语音输入费用信息
- 查看分类统计和预算使用情况

## 注意事项

1. **API密钥安全**
   - 所有API密钥通过环境变量配置
   - 不要将密钥提交到代码仓库
   - 生产环境使用安全的密钥管理方案

2. **浏览器兼容性**
   - 语音识别功能需要 Chrome 或 Edge 浏览器
   - 地图功能需要正确配置高德地图API Key

3. **数据库权限**
   - 确保 Supabase RLS 策略正确配置
   - 用户只能访问自己的数据

4. **API限制**
   - 注意各API服务的调用频率限制
   - 建议在生产环境配置适当的缓存策略

## 开发计划

- [ ] 支持多语言
- [ ] 导出PDF行程单
- [ ] 实时天气信息
- [ ] 社交分享功能
- [ ] 移动端适配

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请通过 GitHub Issues 联系。

---

**项目地址：** https://github.com/tielllzzzqqq/NJUGraduateLLMAssignment4_AITravel_Planner

**Docker镜像：** `registry.cn-hangzhou.aliyuncs.com/your_namespace/travel-planner:latest`

