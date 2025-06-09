const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // 创建新用户
  static async create({ username, email, password }) {
    try {
      // 加密密码
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, password_hash]
      );

      return await this.findById(result.insertId);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('用户名或邮箱已存在');
      }
      throw error;
    }
  }

  // 根据ID查找用户
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // 根据邮箱查找用户
  static async findByEmail(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // 根据用户名查找用户
  static async findByUsername(username) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // 验证密码
  async validatePassword(password) {
    try {
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      throw error;
    }
  }

  // 更新用户信息
  async update(data) {
    try {
      const updateFields = [];
      const updateValues = [];

      // 动态构建更新字段
      if (data.username !== undefined) {
        updateFields.push('username = ?');
        updateValues.push(data.username);
      }
      if (data.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(data.email);
      }
      if (data.password !== undefined) {
        const password_hash = await bcrypt.hash(data.password, 10);
        updateFields.push('password_hash = ?');
        updateValues.push(password_hash);
      }

      if (updateFields.length === 0) {
        return this;
      }

      updateValues.push(this.id);

      await pool.execute(
        `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );

      // 返回更新后的用户信息
      return await User.findById(this.id);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('用户名或邮箱已存在');
      }
      throw error;
    }
  }

  // 删除用户（软删除 - 这里实现硬删除，实际项目中建议软删除）
  async delete() {
    try {
      await pool.execute('DELETE FROM users WHERE id = ?', [this.id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // 转换为安全的JSON格式（不包含密码）
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // 获取用户统计信息
  async getStats() {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          COUNT(DISTINCT rr.article_id) as articles_read,
          COALESCE(SUM(rr.reading_duration), 0) as total_reading_time,
          COUNT(DISTINCT uv.word) as vocabulary_count,
          COUNT(DISTINCT CASE WHEN uv.mastery_level = 'mastered' THEN uv.word END) as mastered_words
        FROM users u
        LEFT JOIN reading_records rr ON u.id = rr.user_id
        LEFT JOIN user_vocabulary uv ON u.id = uv.user_id
        WHERE u.id = ?
        GROUP BY u.id
      `, [this.id]);

      return stats[0] || {
        articles_read: 0,
        total_reading_time: 0,
        vocabulary_count: 0,
        mastered_words: 0
      };
    } catch (error) {
      throw error;
    }
  }
  
  // 更新用户最后登录时间
  static async updateLastLoginTime(userId) {
    try {
      const query = 'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?';
      await pool.execute(query, [userId]);
      return true;
    } catch (error) {
      console.error('更新用户登录时间失败:', error.message);
      throw error;
    }
  }
}

module.exports = User;