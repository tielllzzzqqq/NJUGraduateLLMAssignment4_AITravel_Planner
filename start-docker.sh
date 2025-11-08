#!/bin/bash

echo "=== Docker 服务检查 ==="
echo ""

# 检查 Docker 是否已安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    echo "请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✓ Docker 已安装"

# 检查 Docker daemon 是否运行
if docker info >/dev/null 2>&1; then
    echo "✓ Docker daemon 正在运行"
    echo ""
    echo "Docker 状态:"
    docker info --format '{{.ServerVersion}}' 2>/dev/null || echo "无法获取版本信息"
    exit 0
else
    echo "❌ Docker daemon 未运行"
    echo ""
    echo "=== 解决方案 ==="
    echo ""
    echo "在 macOS 上，需要启动 Docker Desktop："
    echo ""
    echo "方式 1: 使用 Spotlight"
    echo "  1. 按 Cmd + Space 打开 Spotlight"
    echo "  2. 输入 'Docker'"
    echo "  3. 点击 Docker Desktop 应用"
    echo "  4. 等待 Docker Desktop 启动完成（菜单栏会出现 Docker 图标）"
    echo ""
    echo "方式 2: 使用命令行（如果已安装）"
    echo "  open -a Docker"
    echo ""
    echo "方式 3: 从应用程序启动"
    echo "  1. 打开 Finder"
    echo "  2. 进入应用程序文件夹"
    echo "  3. 双击 Docker Desktop"
    echo ""
    echo "等待 Docker Desktop 启动后，再次运行此脚本验证。"
    echo ""
    
    # 尝试自动启动 Docker Desktop（如果存在）
    if [ -d "/Applications/Docker.app" ]; then
        echo "检测到 Docker Desktop，尝试自动启动..."
        open -a Docker
        echo ""
        echo "⏳ 等待 Docker Desktop 启动（这可能需要 10-30 秒）..."
        echo "   请等待菜单栏出现 Docker 图标..."
        
        # 等待最多 60 秒
        for i in {1..60}; do
            sleep 1
            if docker info >/dev/null 2>&1; then
                echo ""
                echo "✓ Docker daemon 已启动！"
                docker info --format 'Docker 版本: {{.ServerVersion}}' 2>/dev/null
                exit 0
            fi
            if [ $((i % 5)) -eq 0 ]; then
                echo "   等待中... ($i/60 秒)"
            fi
        done
        
        echo ""
        echo "⚠  Docker Desktop 启动超时"
        echo "   请手动检查 Docker Desktop 是否已启动"
        echo "   如果已启动，请稍候片刻后再次运行此脚本"
    else
        echo "⚠  未检测到 Docker Desktop"
        echo "   请从 https://www.docker.com/products/docker-desktop 下载并安装"
    fi
    
    exit 1
fi

