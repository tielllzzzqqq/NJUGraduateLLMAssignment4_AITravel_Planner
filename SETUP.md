# 项目设置指南

## 快速设置步骤

### 1. 环境准备

确保已安装：
- Node.js 18+ 
- npm 或 yarn
- Docker (可选，用于部署)

### 2. 获取API密钥

#### Supabase
1. 访问 https://supabase.com
2. 创建新项目
3. 在 Settings > API 中获取：
   - Project URL
   - anon/public key
   - service_role key

#### 高德地图
1. 访问 https://lbs.amap.com/
2. 注册并创建应用
3. 获取 Web 服务 Key

#### 阿里云百炼平台
**已配置，有效期3个月（供助教批改使用）**

如需自行配置：
1. 访问 https://dashscope.aliyun.com/
2. 创建AccessKey
3. 获取 AccessKey ID 和 AccessKey Secret

### 3. 配置环境变量

#### 后端环境变量 (.env)
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

#### 前端环境变量 (frontend/.env)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001/api
VITE_AMAP_KEY=your_amap_web_key
```

### 4. 初始化数据库

1. 在 Supabase 项目中打开 SQL Editor
2. 复制 `database/schema.sql` 的内容
3. 执行 SQL 语句创建表和策略

### 5. 安装依赖

```bash
npm run install:all
```

### 6. 启动开发服务器

```bash
npm run dev
```

前端访问: http://localhost:3000  
后端API: http://localhost:3001

## 常见问题

### 语音识别不工作
- 确保使用 Chrome 或 Edge 浏览器
- 检查浏览器权限设置
- 确保使用 HTTPS 或 localhost

### 地图不显示
- 检查高德地图 API Key 是否正确配置
- 检查浏览器控制台是否有错误
- 确保 API Key 有正确的权限

### 数据库连接失败
- 检查 Supabase URL 和 Key 是否正确
- 确保 RLS 策略已正确配置
- 检查网络连接

### Docker 构建失败
- 确保 Dockerfile 路径正确
- 检查 .dockerignore 配置
- 确保所有依赖文件都已包含

## 生产环境部署

参考 README.md 中的 Docker 部署部分。

