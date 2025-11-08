#!/bin/bash

echo "=== 本地构建 Docker 镜像 ==="
echo ""

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ .env 文件不存在"
    echo "请先创建 .env 文件"
    exit 1
fi

# 检查 frontend/.env 文件（用于前端构建）
if [ ! -f "frontend/.env" ]; then
    echo "⚠  frontend/.env 文件不存在，尝试从根目录 .env 文件读取..."
    
    # 从根目录 .env 读取前端环境变量
    if [ -f ".env" ]; then
        # 提取前端环境变量
        source .env 2>/dev/null || true
        
        # 如果没有 VITE_API_URL，设置默认值
        export VITE_API_URL=${VITE_API_URL:-"http://localhost:3000/api"}
        export VITE_SUPABASE_URL=${SUPABASE_URL}
        export VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
        export VITE_AMAP_KEY=${AMAP_WEB_KEY:-${VITE_AMAP_KEY}}
        
        echo "从根目录 .env 读取的前端环境变量："
        echo "  VITE_API_URL: ${VITE_API_URL}"
        echo "  VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:0:30}..."
        echo "  VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:20}..."
        echo "  VITE_AMAP_KEY: ${VITE_AMAP_KEY:0:20}..."
    else
        echo "❌ 无法找到环境变量配置"
        exit 1
    fi
else
    # 从 frontend/.env 读取
    source frontend/.env
    export VITE_API_URL=${VITE_API_URL:-"http://localhost:3000/api"}
fi

# 检查必需的环境变量
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ 缺少必需的前端环境变量"
    echo "   需要: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"
    exit 1
fi

echo "✓ 环境变量检查通过"
echo ""

# 构建镜像
echo "开始构建 Docker 镜像..."
echo ""

docker build \
  --build-arg VITE_API_URL="${VITE_API_URL}" \
  --build-arg VITE_SUPABASE_URL="${VITE_SUPABASE_URL}" \
  --build-arg VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}" \
  --build-arg VITE_AMAP_KEY="${VITE_AMAP_KEY}" \
  -t travel-planner:latest \
  .

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Docker 镜像构建成功"
    echo ""
    echo "下一步："
    echo "1. 运行容器: docker-compose -f docker-compose.prod.yml up -d"
    echo "2. 或使用自定义镜像: docker run -d -p 3000:3000 --env-file .env travel-planner:latest"
else
    echo ""
    echo "❌ Docker 镜像构建失败"
    exit 1
fi

