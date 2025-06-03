#!/bin/bash

# 启动EnReading开发环境
echo "🚀 启动EnReading开发环境..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 启动后端服务器
echo "📡 启动后端服务器..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，请根据.env.example创建.env文件"
    echo "👉 复制示例配置: cp .env.example .env"
    echo "👉 然后编辑.env文件配置数据库连接"
fi

# 后台启动后端
npm start &
BACKEND_PID=$!
echo "✅ 后端服务器已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端应用..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 启动前端开发服务器
npm run dev &
FRONTEND_PID=$!
echo "✅ 前端应用已启动 (PID: $FRONTEND_PID)"

echo ""
echo "🎉 EnReading开发环境启动完成！"
echo ""
echo "📡 后端API: http://localhost:3001"
echo "🎨 前端应用: http://localhost:3000"
echo "📚 API文档: http://localhost:3001/api-docs"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
wait

# 清理进程
echo "🛑 正在停止服务..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null
echo "✅ 所有服务已停止" 