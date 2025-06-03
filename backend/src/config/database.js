const mysql = require('mysql2/promise');
const redis = require('redis');
require('dotenv').config();

// MySQL连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'enreading',
  charset: 'utf8mb4',
  timezone: '+00:00',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// 创建MySQL连接池
const pool = mysql.createPool(dbConfig);

// Redis连接配置（可选）
let redisClient = null;
const redisEnabled = process.env.REDIS_HOST && process.env.REDIS_HOST !== 'disabled';

if (redisEnabled) {
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  };

  // 创建Redis客户端
  redisClient = redis.createClient(redisConfig);

  redisClient.on('error', (err) => {
    console.error('Redis连接错误:', err);
    console.log('Redis将被禁用，系统将继续运行');
    redisClient = null;
  });

  redisClient.on('connect', () => {
    console.log('Redis连接成功');
  });

  // 连接Redis
  redisClient.connect().catch(err => {
    console.error('Redis连接失败:', err);
    console.log('Redis将被禁用，系统将继续运行');
    redisClient = null;
  });
} else {
  console.log('Redis未配置或已禁用，将使用数据库缓存');
}

// 数据库连接测试
async function testConnection() {
  try {
    // 测试MySQL连接
    const connection = await pool.getConnection();
    console.log('MySQL连接成功');
    connection.release();

    // 测试Redis连接（如果启用）
    if (redisClient) {
      try {
        await redisClient.ping();
        console.log('Redis连接测试成功');
      } catch (error) {
        console.warn('Redis连接测试失败，将禁用Redis:', error.message);
        redisClient = null;
      }
    }
    
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    console.error('连接配置:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database
    });
    return false;
  }
}

// 关闭连接
async function closeConnections() {
  try {
    await pool.end();
    if (redisClient) {
      await redisClient.quit();
    }
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('关闭连接时出错:', error);
  }
}

// Redis操作的包装函数
const redisWrapper = {
  async get(key) {
    if (!redisClient) return null;
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.warn('Redis GET操作失败:', error.message);
      return null;
    }
  },

  async setEx(key, seconds, value) {
    if (!redisClient) return false;
    try {
      await redisClient.setEx(key, seconds, value);
      return true;
    } catch (error) {
      console.warn('Redis SETEX操作失败:', error.message);
      return false;
    }
  },

  async ping() {
    if (!redisClient) return false;
    try {
      await redisClient.ping();
      return true;
    } catch (error) {
      console.warn('Redis PING操作失败:', error.message);
      return false;
    }
  }
};

module.exports = {
  pool,
  redisClient: redisWrapper,
  testConnection,
  closeConnections,
  isRedisEnabled: () => !!redisClient
}; 