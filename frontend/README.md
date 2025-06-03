# EnReading Frontend

英语阅读学习平台的前端应用，基于 React + TypeScript + Tailwind CSS 构建。

## 技术栈

- **React 18** - 用户界面库
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 快速的构建工具
- **Tailwind CSS** - 实用优先的CSS框架
- **React Router** - 客户端路由
- **React Query** - 数据获取和缓存
- **React Hook Form** - 表单处理
- **Zustand** - 状态管理
- **Axios** - HTTP客户端
- **Lucide React** - 图标库
- **React Hot Toast** - 通知组件

## 项目结构

```
src/
├── components/          # 可复用组件
│   ├── ui/             # 基础UI组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── Layout.tsx      # 主布局
│   ├── Header.tsx      # 顶部导航
│   ├── Footer.tsx      # 页脚
│   └── AuthLayout.tsx  # 认证页面布局
├── pages/              # 页面组件
│   ├── Home.tsx        # 首页
│   ├── Login.tsx       # 登录页
│   ├── Register.tsx    # 注册页
│   ├── Articles.tsx    # 文章列表
│   ├── ArticleDetail.tsx # 文章详情
│   ├── ReadingPage.tsx # 阅读页面
│   ├── Vocabulary.tsx  # 词汇库
│   ├── Dashboard.tsx   # 仪表盘
│   └── Profile.tsx     # 个人资料
├── stores/             # 状态管理
│   └── authStore.ts    # 认证状态
├── lib/                # 工具库
│   └── api.ts          # API客户端
├── types/              # TypeScript类型定义
│   └── index.ts
├── App.tsx             # 应用根组件
├── main.tsx            # 应用入口
└── index.css           # 全局样式
```

## 功能特性

### 已实现功能

1. **用户认证系统**
   - 用户注册和登录
   - JWT令牌管理
   - 路由保护

2. **响应式设计**
   - 移动端适配
   - 现代化UI设计
   - 暗色/亮色主题支持

3. **基础组件库**
   - 按钮、输入框、卡片等基础组件
   - 统一的设计系统
   - 可复用的UI组件

4. **路由系统**
   - 公共路由（首页、文章列表等）
   - 受保护路由（仪表盘、词汇库等）
   - 认证路由（登录、注册）

### 待开发功能

1. **文章管理**
   - 文章列表展示
   - 文章详情页面
   - 文章搜索和筛选
   - 阅读进度跟踪

2. **词汇管理**
   - 个人词汇库
   - 单词查询和添加
   - 学习进度跟踪
   - 复习提醒

3. **学习统计**
   - 阅读统计图表
   - 学习进度分析
   - 成就系统

4. **阅读体验**
   - 在线阅读器
   - 即时查词功能
   - 笔记和标注
   - 阅读设置

## 开发指南

### 环境要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

### 修复代码格式

```bash
npm run lint:fix
```

## API集成

前端应用通过 `/api` 路径代理到后端服务（默认 http://localhost:3001）。

主要API模块：

- **authApi** - 用户认证相关
- **articleApi** - 文章管理相关
- **vocabularyApi** - 词汇管理相关
- **dictionaryApi** - 字典查询相关
- **readingApi** - 阅读记录相关

## 状态管理

使用 Zustand 进行状态管理：

- **authStore** - 用户认证状态
- 支持持久化存储
- 简单易用的API

## 样式系统

使用 Tailwind CSS 构建：

- 实用优先的CSS框架
- 响应式设计
- 自定义主题配置
- 组件化样式

## 部署

### 环境变量

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3001
```

### 生产部署

1. 构建应用：`npm run build`
2. 将 `dist` 目录部署到静态文件服务器
3. 配置服务器支持 SPA 路由

## 开发规范

### 组件开发

- 使用 TypeScript 进行类型检查
- 遵循 React Hooks 最佳实践
- 组件应该是纯函数或使用 memo 优化
- 使用 forwardRef 处理 ref 传递

### 样式规范

- 优先使用 Tailwind CSS 类名
- 避免内联样式
- 使用语义化的类名
- 保持样式的一致性

### API调用

- 使用 React Query 进行数据获取
- 统一的错误处理
- 适当的加载状态
- 数据缓存和同步

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License 