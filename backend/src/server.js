require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 EnReading Backend Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`\n🧪 Available Endpoints:`);
    console.log(`   Auth:       http://localhost:${PORT}/api/auth`);
    console.log(`   Articles:   http://localhost:${PORT}/api/articles`);
    console.log(`   Dictionary: http://localhost:${PORT}/api/dictionary`);
    console.log(`   Vocabulary: http://localhost:${PORT}/api/vocabulary`);
    console.log(`   Reading:    http://localhost:${PORT}/api/reading`);
  }
});

// 导出server实例用于测试
module.exports = server; 