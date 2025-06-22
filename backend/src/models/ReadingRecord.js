const { pool } = require('../config/database');

class ReadingRecord {
  // 创建或更新阅读记录
  static async upsert(userId, articleId, recordData) {
    const {
      reading_progress = 0,
      reading_position = 0,
      reading_duration = 0,
      is_completed = false,
      end_time = null
    } = recordData;
    
    const query = `
      INSERT INTO reading_records (
        user_id, article_id, reading_position, reading_progress, 
        reading_duration, is_completed, start_time, end_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        reading_progress = VALUES(reading_progress),
        reading_position = VALUES(reading_position),
        reading_duration = reading_duration + VALUES(reading_duration),
        is_completed = VALUES(is_completed),
        end_time = VALUES(end_time),
        updated_at = NOW()
    `;
    
    const [result] = await pool.execute(query, [
      userId, articleId, reading_position, reading_progress, reading_duration, 
      is_completed, end_time
    ]);
    
    return result;
  }
  
  // 获取用户的阅读记录
  static async getByUserAndArticle(userId, articleId) {
    const query = `
      SELECT * FROM reading_records
      WHERE user_id = ? AND article_id = ?
    `;
    
    const [rows] = await pool.execute(query, [userId, articleId]);
    return rows[0] || null;
  }
  
  // 获取用户的阅读历史
  static async getHistory(userId, options = {}) {
    const { page = 1, limit = 20, startDate = null, endDate = null } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE rr.user_id = ?';
    const params = [userId];
    
    if (startDate) {
      whereClause += ' AND DATE(rr.updated_at) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND DATE(rr.updated_at) <= ?';
      params.push(endDate);
    }
    
    const query = `
      SELECT 
        rr.*,
        a.title,
        a.category,
        a.difficulty_level as difficulty,
        a.word_count as estimated_time,
        '' as image_url
      FROM reading_records rr
      JOIN articles a ON rr.article_id = a.id
      ${whereClause}
      ORDER BY rr.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const [rows] = await pool.execute(query, params);
    
    return rows;
  }
  
  // 获取用户阅读统计
  static async getStats(userId, period = 'all') {
    let dateFilter = '';
    const params = [userId];
    
    switch (period) {
      case 'today':
        dateFilter = 'AND DATE(rr.updated_at) = CURDATE()';
        break;
      case 'week':
        dateFilter = 'AND rr.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case 'month':
        dateFilter = 'AND rr.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_articles,
        COUNT(CASE WHEN rr.is_completed = 1 THEN 1 END) as completed_articles,
        SUM(rr.reading_duration) as total_reading_time,
        AVG(rr.reading_progress) as average_progress,
        MAX(rr.updated_at) as last_reading_date
      FROM reading_records rr
      WHERE rr.user_id = ? ${dateFilter}
    `;
    
    const [rows] = await pool.execute(query, params);
    return rows[0];
  }
  
  // 获取连续阅读天数
  static async getReadingStreak(userId) {
    const query = `
      SELECT DISTINCT DATE(updated_at) as reading_date
      FROM reading_records
      WHERE user_id = ?
      ORDER BY reading_date DESC
      LIMIT 365
    `;
    
    const [rows] = await pool.execute(query, [userId]);
    
    if (rows.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const row of rows) {
      const readingDate = new Date(row.reading_date);
      const diffTime = currentDate.getTime() - readingDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
        currentDate = new Date(readingDate);
      } else if (diffDays === streak + 1) {
        // 允许跳过今天（如果今天还没有阅读）
        streak++;
        currentDate = new Date(readingDate);
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  // 删除阅读记录
  static async delete(userId, articleId) {
    const query = 'DELETE FROM reading_records WHERE user_id = ? AND article_id = ?';
    const [result] = await pool.execute(query, [userId, articleId]);
    
    return result.affectedRows > 0;
  }
  
  // 获取热门文章（基于阅读次数）
  static async getPopularArticles(limit = 10) {
    const query = `
      SELECT 
        a.*,
        COUNT(rr.user_id) as read_count,
        AVG(rr.reading_progress) as avg_progress
      FROM articles a
      JOIN reading_records rr ON a.id = rr.article_id
      GROUP BY a.id
      ORDER BY read_count DESC, avg_progress DESC
      LIMIT ${limit}
    `;
    
    const [rows] = await pool.execute(query);
    return rows;
  }

  // 开始阅读会话
  static async startReading(userId, articleId, startPosition = 0) {
    const query = `
      INSERT INTO reading_records (
        user_id, article_id, reading_position, reading_progress, 
        reading_duration, start_time, created_at, updated_at
      ) VALUES (?, ?, ?, 0, 0, NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        reading_position = VALUES(reading_position),
        start_time = NOW(),
        updated_at = NOW()
    `;
    
    const [result] = await pool.execute(query, [userId, articleId, startPosition]);
    return result;
  }

  // 结束阅读会话
  static async endReading(userId, articleId, endPosition, totalDuration) {
    const query = `
      UPDATE reading_records 
      SET 
        reading_position = ?,
        reading_duration = reading_duration + ?,
        end_time = NOW(),
        updated_at = NOW()
      WHERE user_id = ? AND article_id = ?
    `;
    
    const [result] = await pool.execute(query, [endPosition, totalDuration, userId, articleId]);
    return result;
  }
}

module.exports = ReadingRecord; 