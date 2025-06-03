const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { testConnection, closeConnections } = require('./config/database');

// 路由导入
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const dictionaryRoutes = require('./routes/dictionary');
const vocabularyRoutes = require('./routes/vocabulary');
const readingRoutes = require('./routes/reading');

const app = express();
const PORT = process.env.PORT || 3000;

// 数据库连接测试
testConnection().then(success => {
  if (success) {
    console.log('✅ 数据库连接成功，服务启动');
  } else {
    console.error('❌ 数据库连接失败，请检查配置');
    process.exit(1);
  }
});

// 信任代理
app.set('trust proxy', 1);

// 安全头部
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 全局限流
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP每15分钟最多1000个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Body解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EnReading API',
      version: '1.0.0',
      description: '英语阅读应用 API 文档',
      contact: {
        name: 'EnReading Team',
        email: 'support@enreading.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.enreading.com' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? '生产环境' : '开发环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      responses: {
        UnauthorizedError: {
          description: '访问令牌缺失或无效',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: '无效的令牌' }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: '资源未找到',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: '资源不存在' }
                }
              }
            }
          }
        },
        ValidationError: {
          description: '请求参数验证失败',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: '参数验证失败' }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: '认证', description: '用户认证相关接口' },
      { name: '文章', description: '文章管理接口' },
      { name: '文章管理', description: '管理员文章操作接口' },
      { name: '字典', description: '字典查询接口' },
      { name: '词库', description: '用户词库管理接口' },
      { name: '阅读记录', description: '阅读记录和统计接口' }
    ]
  },
  apis: ['./src/routes/*.js'], // Swagger将扫描的文件
};

const specs = swaggerJsdoc(swaggerOptions);

// Swagger UI
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'EnReading API Documentation'
  }));
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/reading', readingRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '欢迎使用 EnReading API',
    version: '1.0.0',
    documentation: process.env.NODE_ENV !== 'production' ? '/api-docs' : null,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      articles: '/api/articles',
      dictionary: '/api/dictionary',
      vocabulary: '/api/vocabulary',
      reading: '/api/reading'
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的接口不存在',
    path: req.originalUrl,
    method: req.method
  });
});

// 全局错误处理
app.use((error, req, res, next) => {
  console.error('未处理的错误:', error);
  
  // 数据库连接错误
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: '数据库连接失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  
  // JWT错误
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的访问令牌'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '访问令牌已过期'
    });
  }
  
  // Joi验证错误
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      details: error.details
    });
  }
  
  // 默认服务器错误
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，开始优雅关闭服务器...');
  await closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信号，开始优雅关闭服务器...');
  await closeConnections();
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

module.exports = app; 