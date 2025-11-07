# AI旅行规划助手 - 项目提交文档

## GitHub 仓库地址

**GitHub仓库地址：**

```
https://github.com/tielllzzzqqq/NJUGraduateLLMAssignment4_AITravel_Planner
```

## Docker 镜像地址

**阿里云容器镜像服务：**

```
registry.cn-hangzhou.aliyuncs.com/your_namespace/travel-planner:latest
```

## 项目概述

本项目是一个基于AI的智能旅行规划Web应用，通过语音和文字输入，自动生成详细的旅行路线和建议，并提供实时旅行辅助。

## 核心功能

### 1. 智能行程规划
- 支持语音和文字输入旅行需求
- AI自动生成个性化旅行路线
- 包含交通、住宿、景点、餐厅等详细信息
- 基于地图的可视化展示

### 2. 费用预算与管理
- AI进行预算分析和估算
- 实时记录旅行开销
- 支持语音输入费用记录
- 费用分类统计和预算追踪

### 3. 用户管理与数据存储
- 完整的注册登录系统
- 云端行程同步
- 多设备访问支持
- 数据安全保护

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- React Router
- 高德地图 API
- Web Speech API

### 后端
- Node.js + Express + TypeScript
- Supabase (数据库和认证)
- 阿里云百炼平台 (大语言模型)
- 科大讯飞 (语音识别，可选)

### 部署
- Docker
- GitHub Actions (CI/CD)
- 阿里云容器镜像服务

## 快速开始

### 环境要求
- Node.js 18+
- Docker (可选)

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/your-username/travel-planner.git
cd travel-planner
```

2. **配置环境变量**

创建 `.env` 文件：
```bash
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
AMAP_WEB_KEY=your_amap_web_key
ALIBABA_CLOUD_ACCESS_KEY_ID=your_access_key_id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_access_key_secret
ALIBABA_CLOUD_ENDPOINT=dashscope.aliyuncs.com
```

创建 `frontend/.env` 文件：
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001/api
VITE_AMAP_KEY=your_amap_web_key
```

3. **安装依赖**
```bash
npm run install:all
```

4. **初始化数据库**

在 Supabase 项目中执行 `database/schema.sql`

5. **启动开发服务器**
```bash
npm run dev
```

### Docker 部署

1. **构建镜像**
```bash
docker build -t travel-planner .
```

2. **运行容器**
```bash
docker run -d -p 3000:3000 --env-file .env travel-planner
```

3. **从阿里云拉取镜像**
```bash
docker pull registry.cn-hangzhou.aliyuncs.com/your_namespace/travel-planner:latest
docker run -d -p 3000:3000 --env-file .env \
  registry.cn-hangzhou.aliyuncs.com/your_namespace/travel-planner:latest
```

## API 密钥配置

### 阿里云百炼平台（已配置，有效期3个月）

**重要：以下API密钥已配置，供助教批改使用，有效期3个月**

```
ALIBABA_CLOUD_ACCESS_KEY_ID=LTAI5tQxxxxxxxxxxxxx
ALIBABA_CLOUD_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
ALIBABA_CLOUD_ENDPOINT=dashscope.aliyuncs.com
```

**注意：** 实际使用时，请通过环境变量或配置文件设置，不要提交到代码仓库。

### 其他API密钥

1. **Supabase**: 在项目设置中获取
2. **高德地图**: 在高德开放平台创建应用获取
3. **科大讯飞**: 在科大讯飞开放平台创建应用获取（可选）

## 项目结构

```
.
├── backend/              # 后端服务
│   ├── src/
│   │   ├── routes/      # API路由
│   │   ├── services/    # 业务逻辑
│   │   └── config/      # 配置
│   └── package.json
├── frontend/            # 前端应用
│   ├── src/
│   │   ├── pages/       # 页面
│   │   ├── components/  # 组件
│   │   └── api/         # API客户端
│   └── package.json
├── database/            # 数据库脚本
├── .github/workflows/   # CI/CD
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 主要功能演示

### 创建旅行计划
1. 注册/登录账户
2. 点击"创建新计划"
3. 使用语音或文字输入需求
4. AI自动生成详细行程

### 查看计划
- 在仪表板查看所有计划
- 点击计划查看详细信息
- 在地图上查看路线
- 跟踪费用支出

### 费用管理
- 添加费用记录
- 支持语音输入
- 查看分类统计
- 预算追踪

## 注意事项

1. **API密钥安全**: 所有密钥通过环境变量配置，不要提交到代码仓库
2. **浏览器兼容性**: 语音识别需要 Chrome 或 Edge 浏览器
3. **数据库权限**: 确保 Supabase RLS 策略正确配置
4. **API限制**: 注意各API服务的调用频率限制

## 开发记录

项目包含详细的GitHub提交记录，展示了完整的开发过程。

## 联系方式

如有问题，请通过 GitHub Issues 联系。

---

**项目地址**: https://github.com/tielllzzzqqq/NJUGraduateLLMAssignment4_AITravel_Planner  
**Docker镜像**: `registry.cn-hangzhou.aliyuncs.com/your_namespace/travel-planner:latest`  
**提交日期**: 2024年

