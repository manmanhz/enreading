const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
require('dotenv').config();

async function debugDatabase() {
  console.log('🔍 MySQL连接调试信息');
  console.log('==================');
  
  // 显示环境变量
  console.log('📋 环境变量:');
  console.log(`  DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  DB_PORT: ${process.env.DB_PORT || '3306'}`);
  console.log(`  DB_USER: ${process.env.DB_USER || 'root'}`);
  console.log(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : '(empty)'}`);
  console.log(`  DB_NAME: ${process.env.DB_NAME || 'enreading'}`);
  console.log('');

  // 测试连接配置
  const configs = [
    {
      name: '默认配置',
      config: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
      }
    },
    {
      name: '127.0.0.1',
      config: {
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
      }
    },
    {
      name: 'localhost明确指定',
      config: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`🔌 测试连接: ${name}`);
    console.log(`   配置: ${config.host}:${config.port}, user: ${config.user}`);
    
    try {
      const connection = await mysql.createConnection(config);
      await connection.ping();
      console.log(`   ✅ 连接成功!`);
      
      // 测试权限
      try {
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log(`   ✅ 查询权限正常`);
      } catch (error) {
        console.log(`   ❌ 查询权限异常: ${error.message}`);
      }
      
      // 测试数据库是否存在
      try {
        const [dbs] = await connection.execute('SHOW DATABASES');
        const dbNames = dbs.map(db => Object.values(db)[0]);
        console.log(`   📋 可用数据库: ${dbNames.join(', ')}`);
        
        if (dbNames.includes('enreading')) {
          console.log(`   ✅ enreading数据库已存在`);
        } else {
          console.log(`   ⚠️  enreading数据库不存在，需要创建`);
        }
      } catch (error) {
        console.log(`   ❌ 无法查看数据库列表: ${error.message}`);
      }
      
      await connection.end();
      break; // 成功后退出循环
      
    } catch (error) {
      console.log(`   ❌ 连接失败: ${error.message}`);
      if (error.code) {
        console.log(`   错误代码: ${error.code}`);
      }
    }
    console.log('');
  }
}

// 检查MySQL进程
async function checkMySQLProcess() {
  console.log('🔍 检查MySQL进程状态');
  console.log('==================');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    // 检查MySQL进程
    const { stdout: processes } = await execAsync('ps aux | grep mysql | grep -v grep');
    if (processes.trim()) {
      console.log('✅ MySQL进程正在运行:');
      console.log(processes);
    } else {
      console.log('❌ 未找到MySQL进程');
    }
  } catch (error) {
    console.log('❌ 无法检查MySQL进程');
  }
  
  try {
    // 检查端口监听
    const { stdout: ports } = await execAsync('lsof -i :3306 2>/dev/null || netstat -an | grep 3306');
    if (ports.trim()) {
      console.log('✅ 端口3306正在监听:');
      console.log(ports);
    } else {
      console.log('❌ 端口3306未被监听');
    }
  } catch (error) {
    console.log('❌ 无法检查端口状态');
  }
}

async function main() {
  console.log('🚀 EnReading数据库连接调试工具\n');
  
  await checkMySQLProcess();
  console.log('\n');
  await debugDatabase();
  
  console.log('\n📝 解决建议:');
  console.log('1. 如果MySQL未运行，请启动: brew services start mysql');
  console.log('2. 如果端口不是3306，请检查MySQL配置');
  console.log('3. 如果用户/密码错误，请检查.env文件');
  console.log('4. 如果数据库不存在，请执行: mysql -u root -p < database/init.sql');

  const saltRounds = 10;
  const password_hash = await bcrypt.hash('123456', saltRounds);
  console.log(password_hash);
  const existingUser = await User.findByEmail('rietsu@foxmail.com');
  console.log(existingUser.password_hash);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { debugDatabase, checkMySQLProcess }; 