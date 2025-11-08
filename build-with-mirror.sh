#!/bin/bash

# 使用配置了镜像加速器的 Docker 构建镜像
# 注意：需要先配置 Docker 镜像加速器（运行 ./setup-docker-mirror.sh 或手动配置）

echo "=== 构建 Docker 镜像 ==="
echo ""
echo "注意：此脚本使用标准的 Dockerfile"
echo "请确保已配置 Docker 镜像加速器（运行 ./setup-docker-mirror.sh）"
echo ""

# 检查 Docker 镜像加速器是否配置
if docker info 2>/dev/null | grep -q "Registry Mirrors"; then
    echo "✓ Docker 镜像加速器已配置"
    docker info | grep -A 5 "Registry Mirrors"
else
    echo "⚠ 警告: 未检测到 Docker 镜像加速器配置"
    echo "建议运行: ./setup-docker-mirror.sh"
    echo "或者手动在 Docker Desktop 中配置"
    echo ""
    read -p "是否继续构建？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

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
echo "开始构建（使用标准 Dockerfile，通过镜像加速器拉取基础镜像）..."
docker build -f Dockerfile \
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

