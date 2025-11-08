#!/bin/bash

# 配置 Docker 镜像加速器脚本（macOS）

echo "=== 配置 Docker 镜像加速器 ==="
echo ""

# 检查操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "检测到 macOS 系统"
    echo ""
    echo "请按照以下步骤手动配置："
    echo ""
    echo "1. 打开 Docker Desktop"
    echo "2. 点击右上角的设置图标（齿轮）"
    echo "3. 进入 Settings → Docker Engine"
    echo "4. 在 JSON 配置中添加以下内容（保留现有配置）："
    echo ""
    echo '{'
    echo '  "registry-mirrors": ['
    echo '    "https://docker.mirrors.ustc.edu.cn",'
    echo '    "https://hub-mirror.c.163.com",'
    echo '    "https://mirror.baidubce.com"'
    echo '  ]'
    echo '}'
    echo ""
    echo "5. 点击 'Apply & Restart'"
    echo "6. 等待 Docker 重启完成"
    echo ""
    echo "或者，如果你有阿里云账号，可以："
    echo "1. 访问: https://cr.console.aliyun.com/cn-hangzhou/instances/mirrors"
    echo "2. 获取你的专属镜像加速地址"
    echo "3. 将地址添加到 registry-mirrors 中"
    echo ""
    
    # 检查 Docker Desktop 是否运行
    if docker info >/dev/null 2>&1; then
        echo "✓ Docker 正在运行"
        echo ""
        echo "当前 Docker 配置："
        docker info | grep -A 5 "Registry Mirrors" || echo "  未配置镜像加速器"
    else
        echo "⚠ Docker 未运行，请先启动 Docker Desktop"
    fi
    
    echo ""
    echo "配置完成后，运行以下命令验证："
    echo "  docker info | grep -A 5 'Registry Mirrors'"
    echo ""
    echo "然后重新运行构建命令。"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "检测到 Linux 系统"
    echo ""
    
    DAEMON_JSON="/etc/docker/daemon.json"
    
    # 检查是否有 sudo 权限
    if [ "$EUID" -ne 0 ]; then
        echo "需要 sudo 权限来修改 Docker 配置"
        echo "请运行: sudo $0"
        exit 1
    fi
    
    # 备份现有配置
    if [ -f "$DAEMON_JSON" ]; then
        echo "备份现有配置到 ${DAEMON_JSON}.bak"
        cp "$DAEMON_JSON" "${DAEMON_JSON}.bak"
    fi
    
    # 创建或更新配置
    echo "创建 Docker 镜像加速器配置..."
    cat > "$DAEMON_JSON" <<'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF
    
    echo "✓ 配置已创建"
    echo ""
    echo "重启 Docker 服务..."
    systemctl daemon-reload
    systemctl restart docker
    
    echo ""
    echo "✓ Docker 已重启"
    echo ""
    echo "验证配置："
    docker info | grep -A 5 "Registry Mirrors"
    
else
    echo "不支持的操作系统: $OSTYPE"
    echo "请手动配置 Docker 镜像加速器"
    exit 1
fi

