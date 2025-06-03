# EnReading - 英语阅读学习平台

![EnReading](https://img.shields.io/badge/EnReading-v1.0.0-blue)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue)

EnReading 是一个现代化的英语阅读学习平台，旨在通过精选文章和智能词汇管理帮助用户提升英语阅读能力。

## ✨ 主要特性

### 📖 智能阅读体验
- **丰富文章库** - 精选英语文章，涵盖各个难度级别和主题
- **个性化阅读器** - 可调节字体大小、行距、主题色彩
- **即时查词功能** - 点击单词即可查看释义、音标、例句
- **阅读进度跟踪** - 自动保存阅读进度，支持断点续读

### 📚 智能词汇管理
- **个人词汇库** - 一键添加生词到个人词库
- **多源词典集成** - 整合Oxford、Cambridge、Merriam-Webster等权威词典
- **智能复习系统** - 根据记忆曲线智能提醒复习
- **学习进度分析** - 详细的词汇学习统计和分析

### 📊 学习数据分析
- **阅读统计** - 详细的阅读时长、文章数量统计
- **进度可视化** - 直观的学习进度图表
- **学习报告** - 周期性学习报告和建议
- **成就系统** - 阅读里程碑和学习成就

### 🎨 现代化界面
- **响应式设计** - 完美适配桌面端、平板和手机
- **优雅UI** - 采用现代化设计语言，提供舒适的阅读体验
- **主题切换** - 支持亮色/暗色/护眼模式
- **无障碍访问** - 良好的键盘导航和屏幕阅读器支持

## 🏗️ 技术架构

### 前端技术栈
- **React 18** - 现代化的用户界面库
- **TypeScript** - 类型安全的JavaScript超集
- **Tailwind CSS** - 实用优先的CSS框架
- **Vite** - 极速的前端构建工具
- **React Router** - 声明式路由
- **React Query** - 强大的数据获取和缓存
- **Zustand** - 轻量级状态管理
- **React Hook Form** - 高性能表单库

### 后端技术栈
- **Node.js** - JavaScript运行时环境
- **Express.js** - 快速、极简的Web框架
- **MySQL** - 可靠的关系型数据库
- **Redis** - 高性能缓存数据库
- **JWT** - 安全的身份认证
- **Swagger** - API文档自动生成
- **Joi** - 数据验证库

### 核心功能模块
- **用户认证系统** - 注册、登录、权限管理
- **文章管理系统** - 文章CRUD、分类、搜索
- **阅读进度系统** - 进度跟踪、统计分析
- **词汇管理系统** - 词库管理、复习提醒
- **字典集成系统** - 多源字典、智能缓存

## 🚀 快速开始

### 环境要求
- Node.js 16.0+
- MySQL 5.7+
- Redis 6.0+ (可选)
- npm 或 yarn

### 安装和运行

#### 1. 克隆项目
```bash
git clone <repository-url>
cd enreading
```

#### 2. 快速启动（推荐）
```bash
# 使用一键启动脚本
./start-dev.sh
```

#### 3. 手动启动

**后端设置**
```bash
cd backend
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接

# 初始化数据库
mysql -u root -p < database/init.sql

# 启动后端服务
npm start
```

**前端设置**
```bash
cd frontend
npm install

# 启动前端开发服务器
npm run dev
```

#### 4. 访问应用
- 前端应用: http://localhost:3000
- 后端API: http://localhost:3001
- API文档: http://localhost:3001/api-docs

## 📁 项目结构

```
enreading/
├── backend/                 # 后端应用
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── controllers/    # 控制器
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由定义
│   │   ├── services/       # 业务逻辑
│   │   ├── middleware/     # 中间件
│   │   └── utils/          # 工具函数
│   ├── database/           # 数据库脚本
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── pages/          # 页面组件
│   │   ├── stores/         # 状态管理
│   │   ├── lib/            # 工具库
│   │   ├── types/          # TypeScript类型
│   │   └── styles/         # 样式文件
│   └── package.json
├── docs/                   # 项目文档
├── start-dev.sh           # 开发环境启动脚本
└── README.md
```

## 🎯 核心功能演示

### 文章阅读界面
- 清晰的文章布局和排版
- 实时阅读进度跟踪
- 单词即点即查功能
- 个性化阅读设置

### 词汇学习系统
- 一键添加生词到词库
- 智能复习提醒
- 词汇掌握度分析
- 学习统计图表

### 数据统计面板
- 阅读时长统计
- 文章完成度分析
- 词汇学习进度
- 学习习惯洞察

## 🔧 配置说明

### 数据库配置
```env
# MySQL配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=enreading

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### 字典API配置
```env
# 字典API密钥
OXFORD_API_KEY=your_oxford_api_key
CAMBRIDGE_API_KEY=your_cambridge_api_key
MERRIAM_WEBSTER_API_KEY=your_merriam_api_key
YOUDAO_API_KEY=your_youdao_api_key
```

## 📚 API文档

完整的API文档可在以下地址查看：
- 开发环境: http://localhost:3001/api-docs
- 生产环境: https://your-domain.com/api-docs

### 主要API端点

#### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户信息

#### 文章相关
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/:id` - 获取文章详情
- `POST /api/articles/:id/progress` - 更新阅读进度

#### 词汇相关
- `GET /api/vocabulary` - 获取个人词库
- `POST /api/vocabulary` - 添加单词
- `PUT /api/vocabulary/:word/mastery` - 更新掌握度

#### 字典相关
- `GET /api/dictionary/lookup/:word` - 查询单词
- `POST /api/dictionary/batch-lookup` - 批量查询

## 🚀 部署指南

### 生产环境部署

#### 1. 前端部署
```bash
cd frontend
npm run build
# 将 dist 目录部署到静态文件服务器
```

#### 2. 后端部署
```bash
cd backend
npm install --production
# 配置生产环境 .env
# 使用 PM2 或其他进程管理器启动
pm2 start src/server.js --name enreading-api
```

#### 3. 数据库部署
```bash
# 在生产环境MySQL中执行
mysql -u root -p < database/init.sql
```

### Docker部署（即将支持）
```bash
# 敬请期待
docker-compose up -d
```

## 🛠️ 开发指南

### 前端开发
```bash
cd frontend
npm run dev     # 启动开发服务器
npm run build   # 构建生产版本
npm run lint    # 代码检查
```

### 后端开发
```bash
cd backend
npm run dev     # 启动开发服务器（热重载）
npm start       # 启动生产服务器
npm test        # 运行测试
```

### 数据库迁移
```bash
# 执行数据库初始化
npm run db:init

# 重置数据库（开发环境）
npm run db:reset
```

## 🤝 贡献指南

我们欢迎各种形式的贡献！

### 如何贡献
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 配置的代码规范
- 组件和函数需要添加适当的注释
- 提交信息采用约定式提交格式

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 团队

- **产品经理** - 产品规划和需求分析
- **UI/UX设计师** - 界面设计和用户体验
- **前端开发** - React应用开发
- **后端开发** - Node.js API开发
- **数据库设计** - MySQL数据库架构

## 📞 联系我们

- 邮箱: contact@enreading.com
- 官网: https://enreading.com
- 问题反馈: [GitHub Issues](https://github.com/your-org/enreading/issues)

## 🎉 致谢

感谢以下开源项目和服务提供商：

- [React](https://reactjs.org/) - 用户界面构建
- [Node.js](https://nodejs.org/) - JavaScript运行时
- [Express](https://expressjs.com/) - Web应用框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Oxford Dictionary API](https://developer.oxforddictionaries.com/) - 词典服务
- [Vercel](https://vercel.com/) - 部署平台

---

⭐ 如果这个项目对你有帮助，请给我们一个星标！

📚 开始你的英语阅读学习之旅吧！ 