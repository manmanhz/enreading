const { pool } = require('../config/database');

class Article {
  // 获取文章列表（支持分页、筛选、搜索）
  static async getList(options = {}) {
    const {
      page = 1,
      limit = 10,
      category = null,
      difficulty = null,
      search = null,
      userId = null
    } = options;

    const offset = (page - 1) * limit;
    
    let whereConditions = ['a.status = "published"'];
    let params = [];
    
    if (category) {
      whereConditions.push('a.category = ?');
      params.push(category);
    }
    
    if (difficulty) {
      whereConditions.push('a.difficulty_level = ?');
      params.push(difficulty);
    }
    
    if (search) {
      whereConditions.push('(a.title LIKE ? OR a.content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // 如果提供了用户ID，则联接阅读记录表获取进度
    const readingJoin = userId ? `
      LEFT JOIN reading_records rr ON a.id = rr.article_id AND rr.user_id = ?
    ` : '';
    
    const readingFields = userId ? `
      COALESCE(rr.reading_progress, 0) as reading_progress,
      CASE WHEN rr.id IS NOT NULL THEN 1 ELSE 0 END as is_started
    ` : '0 as reading_progress, 0 as is_started';
    
    if (userId) {
      params.unshift(userId); // 添加到参数列表开头
    }
    
    const query = `
      SELECT 
        a.*,
        ${readingFields}
      FROM articles a
      ${readingJoin}
      WHERE ${whereClause}
      ORDER BY a.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const [rows] = await pool.execute(query, params);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM articles a
      WHERE ${whereClause}
    `;
    
    // 移除分页参数，只保留筛选参数
    const countParams = userId ? params.slice(1, -2) : params.slice(0, -2);
    const [countResult] = await pool.execute(countQuery, countParams);
    
    return {
      articles: rows,
      total: countResult[0].total,
      totalPages: Math.ceil(countResult[0].total / limit),
      currentPage: page
    };
  }
  
  // 根据ID获取文章详情
  static async getById(id, userId = null) {
    // 如果提供了用户ID，则联接阅读记录表
    const readingJoin = userId ? `
      LEFT JOIN reading_records rr ON a.id = rr.article_id AND rr.user_id = ?
    ` : '';
    
    const readingFields = userId ? `
      COALESCE(rr.reading_progress, 0) as reading_progress,
      rr.reading_position,
      rr.reading_duration,
      rr.is_completed,
      CASE WHEN rr.id IS NOT NULL THEN 1 ELSE 0 END as is_started
    ` : '0 as reading_progress, NULL as reading_position, 0 as reading_duration, 0 as is_started';
    
    const params = userId ? [userId, id] : [id];
    
    const query = `
      SELECT 
        a.*,
        ${readingFields}
      FROM articles a
      ${readingJoin}
      WHERE a.id = ?
    `;
    
    const [rows] = await pool.execute(query, params);
    return rows[0] || null;
  }
  
  // 创建新文章
  static async create(articleData) {
    const {
      title,
      content,
      summary,
      category,
      difficulty,
      estimated_time,
      source_url,
      source_name,
      image_url,
      tags
    } = articleData;
    
    const query = `
      INSERT INTO articles (
        title, content, summary, category, difficulty, 
        estimated_time, source_url, source_name, image_url, 
        tags, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NOW(), NOW())
    `;
    
    const [result] = await pool.execute(query, [
      title, content, summary, category, difficulty,
      estimated_time, source_url, source_name, image_url,
      JSON.stringify(tags || [])
    ]);
    
    return result.insertId;
  }
  
  // 更新文章
  static async update(id, updateData) {
    const fields = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'tags' ? JSON.stringify(updateData[key]) : updateData[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = NOW()');
    values.push(id);
    
    const query = `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.execute(query, values);
    
    return result.affectedRows > 0;
  }
  
  // 删除文章（软删除）
  static async delete(id) {
    const query = 'UPDATE articles SET status = "deleted", updated_at = NOW() WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    
    return result.affectedRows > 0;
  }
  
  // 获取分类列表
  static async getCategories() {
    const query = `
      SELECT 
        category,
        COUNT(*) as count
      FROM articles 
      GROUP BY category
      ORDER BY count DESC
    `;
    
    const [rows] = await pool.execute(query);
    return rows;
  }
  
  // 搜索文章
  static async search(keyword, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT * FROM articles
      WHERE status = "published" 
      AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const searchTerm = `%${keyword}%`;
    const [rows] = await pool.execute(query, [
      searchTerm, searchTerm, searchTerm
    ]);
    
    return rows;
  }
}

module.exports = Article;