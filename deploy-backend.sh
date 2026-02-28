#!/bin/bash
# 后端双版本部署脚本
# 用法: ./deploy-backend.sh [site|factory|both]

set -e

PROJECT_DIR="/root/factory-monorepo"
PORT_SITE=3000
PORT_FACTORY=3001

echo "=== 工厂管理项目后端部署 ==="

# 检查代码是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo "错误: 项目目录不存在: $PROJECT_DIR"
    echo "请先克隆项目到服务器"
    exit 1
fi

# 安装依赖 (如果需要)
cd $PROJECT_DIR/backend
if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

# 停止现有进程
echo "停止现有进程..."
pm2 stop factory-site 2>/dev/null || true
pm2 stop factory-backend 2>/dev/null || true

# 启动 site 版本 (端口 3000)
echo "启动 site 版本 (端口 $PORT_SITE)..."
PORT=$PORT_SITE NODE_ENV=production pm2 start \
    --name factory-site \
    npm -- start

# 启动 factory 版本 (端口 3001)
echo "启动 factory 版本 (端口 $PORT_FACTORY)..."
PORT=$PORT_FACTORY NODE_ENV=production pm2 start \
    --name factory-backend \
    npm -- start

# 保存 pm2 列表
pm2 save

echo ""
echo "=== 部署完成 ==="
echo "site 版本:     http://localhost:$PORT_SITE"
echo "factory 版本:  http://localhost:$PORT_FACTORY"
echo ""
pm2 list
