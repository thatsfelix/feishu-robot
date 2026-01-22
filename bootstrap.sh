#!/bin/bash

# 检查 Nodejs 是否已安装 / Check if Nodejs is installed
if ! command -v node &>/dev/null; then
    echo "当前设备未安装Nodejs, 请安装后重试。/ Nodejs not installed, please install Nodejs before retrying."
    echo "可参考./nodejs-setup.md 安装nodejs。/ Please refer to./nodejs-setup.md to install Nodejs."
    exit 1
else
    echo "Nodejs已安装，版本$(node -v)/ Using Node.js version: $(node -v)"
fi

# 安装项目依赖 / Install project dependencies
echo "安装项目依赖... / Installing project dependencies..."
npm i

# 启动项目 / Start the project
echo "启动飞书 AI 机器人... / Starting Feishu AI Bot..."

# 检查必要的环境变量
if [ -z "$APP_ID" ] || [ -z "$APP_SECRET" ]; then
    echo "❌ 请设置 APP_ID 和 APP_SECRET 环境变量"
    echo "❌ Please set APP_ID and APP_SECRET environment variables"
    exit 1
fi

if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo "⚠️  未设置 DEEPSEEK_API_KEY，AI 功能将不可用"
    echo "⚠️  DEEPSEEK_API_KEY not set, AI features will be disabled"
fi

npm run dev
