#!/bin/bash

echo "=== 测试 Docker 容器运行 ==="
echo ""

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ .env 文件不存在"
    echo "请先创建 .env 文件并配置环境变量"
    exit 1
fi

echo "✓ .env 文件存在"
echo ""

# 检查 Docker 是否运行
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon 未运行"
    echo "运行: ./start-docker.sh"
    exit 1
fi

echo "✓ Docker 运行正常"
echo ""

# 检查镜像是否存在
if ! docker images | grep -q "travel_planner.*latest"; then
    echo "⚠ 镜像不存在，正在拉取..."
    docker pull --platform linux/amd64 crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest
fi

echo "✓ 镜像已就绪"
echo ""

# 停止并删除旧容器（如果存在）
if docker ps -a | grep -q travel-planner; then
    echo "停止并删除旧容器..."
    docker stop travel-planner 2>/dev/null
    docker rm travel-planner 2>/dev/null
fi

echo "启动容器..."
echo ""

# 使用 docker-compose 启动
docker-compose -f docker-compose.prod.yml up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ 容器启动成功"
    echo ""
    echo "等待容器启动（5秒）..."
    sleep 5
    
    echo ""
    echo "=== 容器状态 ==="
    docker ps | grep travel-planner
    
    echo ""
    echo "=== 环境变量检查 ==="
    docker exec travel-planner env | grep -E "SUPABASE_URL|SUPABASE_ANON_KEY|DASHSCOPE_API_KEY|PORT|NODE_ENV" | head -5 | sed 's/=.*/=***/'
    
    echo ""
    echo "=== 健康检查 ==="
    RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null)
    if echo "$RESPONSE" | grep -q "ok"; then
        echo "✓ 健康检查通过: $RESPONSE"
    else
        echo "⚠ 健康检查未通过: $RESPONSE"
        echo "查看日志: docker logs travel-planner"
    fi
    
    echo ""
    echo "=== 日志（最近10行） ==="
    docker logs --tail 10 travel-planner
    
    echo ""
    echo "=== 测试完成 ==="
    echo "应用地址: http://localhost:3000"
    echo "查看完整日志: docker logs -f travel-planner"
    echo "停止容器: docker-compose -f docker-compose.prod.yml down"
else
    echo "❌ 容器启动失败"
    echo "查看日志: docker logs travel-planner"
    exit 1
fi

