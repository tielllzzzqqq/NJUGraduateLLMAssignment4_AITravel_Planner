#!/bin/bash

# 使用阿里云镜像源构建 Docker 镜像

echo "=== 使用阿里云镜像源构建 Docker 镜像 ==="
echo ""

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ .env 文件不存在"
    echo "请先创建 .env 文件并配置环境变量"
    exit 1
fi

# 加载环境变量
source .env

# 检查必要的环境变量
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "⚠️  警告: SUPABASE_URL 或 SUPABASE_ANON_KEY 未设置"
    echo "前端可能无法正常工作"
fi

echo "构建参数:"
echo "  VITE_API_URL: /api"
echo "  VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:-未设置}"
echo "  VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:-未设置}"
echo "  VITE_AMAP_KEY: ${VITE_AMAP_KEY:-未设置}"
echo ""

# 构建镜像
echo "开始构建..."
docker build -f Dockerfile.mirror \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}" \
  --build-arg VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}" \
  --build-arg VITE_AMAP_KEY="${VITE_AMAP_KEY:-}" \
  -t travel-planner:local \
  .

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ 构建成功！"
    echo ""
    echo "接下来："
    echo "1. 修改 docker-compose.prod.yml，将 image 改为: travel-planner:local"
    echo "2. 运行: docker-compose -f docker-compose.prod.yml up -d"
else
    echo ""
    echo "❌ 构建失败"
    exit 1
fi

