# EnReading Backend API

英语阅读应用后端服务，提供字典查询、用户管理、阅读跟踪等核心功能。

## 快速开始

### 环境要求

- Node.js 18.x LTS 或更高版本
- MySQL 8.0 或更高版本  
- Redis 6.0 或更高版本

### 安装依赖

```bash
cd enreading/backend
npm install
```

### 环境配置

1. 复制环境变量模板：
```bash
cp env.example .env
```

2. 编辑 `.env` 文件，配置数据库和API密钥：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=enreading

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 字典API密钥（可选，用于生产环境）
OXFORD_APP_ID=your_oxford_app_id
OXFORD_APP_KEY=your_oxford_app_key
CAMBRIDGE_API_KEY=your_cambridge_api_key
```

### 数据库初始化

1. 创建数据库：
```sql
CREATE DATABASE enreading CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 执行初始化脚本：
```bash
mysql -u root -p enreading < database/init.sql
```

### 启动服务

**开发模式：**
```bash
npm run dev
```

**生产模式：**
```bash
npm start
```

服务启动后访问：
- 健康检查：http://localhost:3000/health
- API文档：http://localhost:3000/api/dictionary/status

## API 接口

### 字典服务 API

#### 1. 获取单词释义
```http
GET /api/dictionary/define/{word}
```

**参数：**
- `word` (path): 要查询的单词
- `format` (query): 返回格式，可选 `mobile` 或 `web`，默认 `mobile`
- `refresh` (query): 是否强制刷新缓存，可选 `true` 或 `false`，默认 `false`

**示例：**
```bash
curl "http://localhost:3000/api/dictionary/define/hello"
```

**响应：**
```json
{
  "success": true,
  "data": {
    "word": "hello",
    "phonetic": "/həˈloʊ/",
    "definitions": [
      {
        "partOfSpeech": "interjection",
        "definition": "used as a greeting or to begin a phone conversation",
        "source": "freedict"
      }
    ],
    "examples": ["Hello, how are you?"],
    "audio": "https://api.dictionaryapi.dev/media/pronunciations/hello.mp3",
    "sources": ["freedict"],
    "quality": 0.8,
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "cached": false
}
```

#### 2. 批量获取单词释义
```http
POST /api/dictionary/batch
```

**请求体：**
```json
{
  "words": ["hello", "world", "example"]
}
```

#### 3. 搜索单词建议
```http
GET /api/dictionary/search?query=hel&limit=10
```

#### 4. 获取热门单词
```http
GET /api/dictionary/popular?limit=20
```

#### 5. 预加载文章单词
```http
POST /api/dictionary/preload
```

**请求体：**
```json
{
  "content": "This is an example article content with many English words."
}
```

#### 6. 获取服务状态
```http
GET /api/dictionary/status
```

## 核心功能

### 1. 多源字典集成

支持集成多个外部字典API：

- **牛津词典 (Oxford)**：权威性最高，提供详细释义
- **剑桥词典 (Cambridge)**：学习者友好，释义清晰
- **韦氏词典 (Merriam-Webster)**：美式英语权威
- **有道词典 (Youdao)**：中英翻译，本土化
- **Free Dictionary**：免费备用，基础功能

### 2. 智能缓存系统

三层缓存架构确保查询性能：

```
用户查询 → 内存缓存(5分钟) → Redis缓存(24小时) → 数据库缓存(永久) → 外部API
             ↓ 95%命中率        ↓ 4%命中率         ↓ 0.9%命中率      ↓ 0.1%
           响应时间1ms       响应时间10ms      响应时间100ms   响应时间1000ms
```

### 3. 服务容错机制

- **健康监控**：实时监控各API的响应时间和成功率
- **智能路由**：根据API状态自动选择最佳字典源
- **熔断机制**：API异常时自动切换到备用源
- **降级策略**：所有API不可用时提供基础翻译服务

### 4. 性能优化

- **并行查询**：同时调用多个字典源，取最佳结果
- **数据合并**：智能合并多源释义，去重优化
- **预加载机制**：文章发布时预加载可能的生词
- **限流控制**：防止API调用超出配额

## 项目结构

```
src/
├── app.js                 # 应用入口文件
├── config/
│   └── database.js        # 数据库连接配置
├── models/
│   └── User.js           # 用户数据模型
├── services/
│   └── DictionaryService.js  # 字典服务核心逻辑
├── controllers/
│   └── DictionaryController.js  # 字典API控制器
└── routes/
    └── dictionary.js      # 字典API路由配置

database/
└── init.sql              # 数据库初始化脚本

.env.example              # 环境变量模板
package.json              # 项目配置和依赖
README.md                 # 项目说明文档
```

## 开发指南

### 环境变量说明

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | development | 否 |
| `PORT` | 服务端口 | 3000 | 否 |
| `DB_HOST` | MySQL主机 | localhost | 是 |
| `DB_USER` | MySQL用户 | root | 是 |
| `DB_PASSWORD` | MySQL密码 | - | 是 |
| `DB_NAME` | 数据库名 | enreading | 是 |
| `REDIS_HOST` | Redis主机 | localhost | 是 |
| `OXFORD_APP_ID` | 牛津词典APP ID | - | 否 |
| `OXFORD_APP_KEY` | 牛津词典密钥 | - | 否 |

### 添加新的字典源

1. 在 `DictionaryService.js` 中添加字典配置
2. 实现对应的查询方法
3. 添加数据解析逻辑
4. 更新字典源优先级

### 错误处理

所有API接口都遵循统一的错误响应格式：

```json
{
  "success": false,
  "error": "错误信息",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 日志记录

- 请求日志：记录所有API请求
- 错误日志：记录异常和错误信息
- 性能日志：记录字典查询性能指标

## 部署说明

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 生产环境配置

1. 设置环境变量 `NODE_ENV=production`
2. 配置反向代理 (Nginx)
3. 启用 HTTPS
4. 配置监控和日志收集
5. 设置自动扩缩容

### 监控指标

- API响应时间
- 缓存命中率
- 字典源成功率
- 系统资源使用率

## 测试

### 运行测试
```bash
npm test
```

### API测试示例

```bash
# 测试单词查询
curl "http://localhost:3000/api/dictionary/define/hello"

# 测试批量查询
curl -X POST "http://localhost:3000/api/dictionary/batch" \
  -H "Content-Type: application/json" \
  -d '{"words": ["hello", "world"]}'

# 测试服务状态
curl "http://localhost:3000/api/dictionary/status"
```

## 许可证

MIT License

## 支持

如有问题请创建 Issue 或联系开发团队。 