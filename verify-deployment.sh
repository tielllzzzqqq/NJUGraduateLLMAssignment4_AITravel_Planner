#!/bin/bash

echo "=== 验证 Docker 部署 ==="
echo ""

# 检查容器是否运行
if docker ps | grep -q travel-planner; then
    echo "✓ 容器正在运行"
else
    echo "✗ 容器未运行"
    echo "  请先运行: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

# 检查健康状态
HEALTH=$(docker inspect travel-planner --format='{{.State.Health.Status}}' 2>/dev/null)
if [ "$HEALTH" = "healthy" ]; then
    echo "✓ 容器健康状态: $HEALTH"
elif [ "$HEALTH" = "starting" ]; then
    echo "⚠ 容器健康状态: $HEALTH (正在启动中，请稍候...)"
else
    echo "⚠ 容器健康状态: ${HEALTH:-unknown}"
fi

# 等待几秒让应用完全启动
echo "等待应用启动..."
sleep 3

# 测试健康检查端点
RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null)
if echo "$RESPONSE" | grep -q "ok"; then
    echo "✓ 健康检查通过: $RESPONSE"
else
    echo "✗ 健康检查失败: $RESPONSE"
    echo "  查看日志: docker logs travel-planner"
    exit 1
fi

# 检查端口
if command -v netstat >/dev/null 2>&1; then
    if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
        echo "✓ 端口 3000 正在监听"
    else
        echo "⚠ 无法确认端口 3000 状态（netstat 不可用）"
    fi
elif command -v ss >/dev/null 2>&1; then
    if ss -tuln 2>/dev/null | grep -q ":3000 "; then
        echo "✓ 端口 3000 正在监听"
    else
        echo "⚠ 无法确认端口 3000 状态"
    fi
else
    echo "⚠ 无法检查端口状态（netstat/ss 不可用）"
fi

# 检查环境变量
echo ""
echo "=== 环境变量检查 ==="
ENV_VARS=$(docker exec travel-planner env 2>/dev/null | grep -E "SUPABASE_URL|DASHSCOPE_API_KEY|PORT|NODE_ENV" | head -5)
if [ -n "$ENV_VARS" ]; then
    echo "$ENV_VARS" | while IFS= read -r line; do
        if echo "$line" | grep -q "="; then
            KEY=$(echo "$line" | cut -d'=' -f1)
            VALUE=$(echo "$line" | cut -d'=' -f2-)
            if [ -n "$VALUE" ] && [ "$VALUE" != "" ]; then
                echo "✓ $KEY: 已配置"
            else
                echo "✗ $KEY: 未配置"
            fi
        fi
    done
else
    echo "⚠ 无法检查环境变量"
fi

echo ""
echo "=== 部署验证完成 ==="
echo "应用地址: http://localhost:3000"
echo "查看日志: docker logs -f travel-planner"
echo "停止服务: docker-compose -f docker-compose.prod.yml down"

