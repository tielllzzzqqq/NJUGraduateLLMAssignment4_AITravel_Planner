#!/bin/bash

echo "=== 检查 Docker 容器状态 ==="
echo ""

# 检查容器是否运行
if ! docker ps | grep -q travel-planner; then
    echo "❌ 容器未运行"
    echo "运行: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "✓ 容器正在运行"
echo ""

# 检查健康状态
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' travel-planner 2>/dev/null)
echo "容器健康状态: $HEALTH"
echo ""

# 检查前端文件
echo "=== 检查前端文件 ==="
docker exec travel-planner sh -c "ls -la /app/public/ 2>/dev/null | head -10"
echo ""

# 检查后端日志
echo "=== 后端日志（最近5行）==="
docker logs --tail 5 travel-planner
echo ""

# 检查 API 端点
echo "=== 检查 API 端点 ==="
echo "健康检查:"
curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
echo ""

# 检查前端 HTML
echo "=== 检查前端 HTML ==="
HTML=$(curl -s http://localhost:3000/ | head -20)
if echo "$HTML" | grep -q "index.html\|root"; then
    echo "✓ 前端 HTML 可访问"
    echo "$HTML" | head -10
else
    echo "⚠ 前端 HTML 可能有问题"
    echo "$HTML"
fi
echo ""

# 检查前端 JavaScript 文件
echo "=== 检查前端 JavaScript ==="
JS_FILE=$(curl -s http://localhost:3000/ | grep -o 'src="/assets/[^"]*\.js"' | head -1 | sed 's/src="//;s/"//')
if [ -n "$JS_FILE" ]; then
    echo "JavaScript 文件: $JS_FILE"
    JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$JS_FILE")
    if [ "$JS_STATUS" = "200" ]; then
        echo "✓ JavaScript 文件可访问 (HTTP $JS_STATUS)"
        # 检查 API URL 配置
        if curl -s "http://localhost:3000$JS_FILE" | grep -q "localhost:3001"; then
            echo "⚠ 警告: JavaScript 中可能包含 localhost:3001（应该使用 /api）"
            echo "   需要重新构建 Docker 镜像"
        elif curl -s "http://localhost:3000$JS_FILE" | grep -q '"/api"'; then
            echo "✓ JavaScript 使用相对路径 /api"
        fi
    else
        echo "❌ JavaScript 文件无法访问 (HTTP $JS_STATUS)"
    fi
else
    echo "⚠ 无法找到 JavaScript 文件路径"
fi
echo ""

# 检查环境变量
echo "=== 检查环境变量 ==="
echo "后端环境变量:"
docker exec travel-planner env | grep -E "SUPABASE|DASHSCOPE|PORT|NODE_ENV" | sed 's/=.*/=***/'
echo ""

echo "=== 检查完成 ==="
echo ""
echo "如果前端无法加载，可能的原因："
echo "1. Docker 镜像是在代码修改之前构建的（需要重新构建）"
echo "2. 前端环境变量未在构建时设置（需要在 GitHub Secrets 中配置）"
echo "3. 浏览器控制台可能有错误信息（按 F12 查看）"
echo ""
echo "解决方案："
echo "1. 在 GitHub Secrets 中配置 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_AMAP_KEY"
echo "2. 推送代码触发 GitHub Actions 重新构建镜像"
echo "3. 拉取新镜像: docker-compose -f docker-compose.prod.yml pull"
echo "4. 重启容器: docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "详细说明请查看: DOCKER_FRONTEND_ENV.md"

