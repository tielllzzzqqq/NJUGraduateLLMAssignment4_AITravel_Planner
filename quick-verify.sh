#!/bin/bash

echo "=== 快速验证 Docker 部署流程 ==="
echo ""

# 检查 Docker
echo "1. 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon 未运行"
    echo "   运行: ./start-docker.sh"
    exit 1
fi
echo "✓ Docker 运行正常"

# 检查是否已登录
echo ""
echo "2. 检查阿里云容器镜像服务登录状态..."
if docker login crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com --username test --password-stdin <<< "test" 2>&1 | grep -q "Login Succeeded\|already logged in"; then
    echo "✓ 已登录（或可以登录）"
else
    echo "⚠ 需要登录"
    echo "   运行: docker login crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com"
fi

# 检查镜像
echo ""
echo "3. 检查本地镜像..."
if docker images | grep -q "travel_planner.*latest"; then
    echo "✓ 镜像已存在"
    docker images | grep "travel_planner.*latest" | head -1
else
    echo "⚠ 镜像不存在，需要拉取"
    echo "   运行: docker pull --platform linux/amd64 crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest"
fi

# 检查 .env 文件
echo ""
echo "4. 检查 .env 文件..."
if [ -f ".env" ]; then
    echo "✓ .env 文件存在"
    
    # 检查必需的环境变量
    REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "DASHSCOPE_API_KEY" "PORT")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${var}=" .env 2>/dev/null; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -eq 0 ]; then
        echo "✓ 所有必需的环境变量都已配置"
    else
        echo "⚠ 缺少以下环境变量:"
        for var in "${MISSING_VARS[@]}"; do
            echo "   - $var"
        done
    fi
else
    echo "❌ .env 文件不存在"
    echo "   请创建 .env 文件并配置必需的环境变量"
    echo "   参考 DOCKER_DEPLOY.md 中的配置说明"
fi

# 检查端口占用
echo ""
echo "5. 检查端口 3000..."
if lsof -i :3000 >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":3000 "; then
    echo "⚠ 端口 3000 已被占用"
    echo "   如果需要使用其他端口，请修改 docker-compose.prod.yml"
else
    echo "✓ 端口 3000 可用"
fi

# 检查容器
echo ""
echo "6. 检查运行中的容器..."
if docker ps | grep -q travel-planner; then
    echo "✓ 容器正在运行"
    docker ps | grep travel-planner
else
    echo "ℹ 容器未运行"
    echo "   运行: docker-compose -f docker-compose.prod.yml up -d"
fi

echo ""
echo "=== 验证完成 ==="
echo ""
echo "下一步："
echo "1. 确保 .env 文件已配置"
echo "2. 拉取镜像: docker pull --platform linux/amd64 crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com/aliyun_lzq/travel_planner:latest"
echo "3. 启动容器: docker-compose -f docker-compose.prod.yml up -d"
echo "4. 验证部署: ./verify-deployment.sh"

