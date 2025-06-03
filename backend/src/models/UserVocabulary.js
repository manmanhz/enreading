const { pool } = require('../config/database');

class UserVocabulary {
  // 添加单词到用户词库
  static async addWord(userId, wordData) {
    const {
      word,
      definition,
      pronunciation,
      part_of_speech,
      example_sentence,
      source_article_id,
      source_context
    } = wordData;
    
    const query = `
      INSERT INTO user_vocabulary (
        user_id, word, definition, pronunciation, part_of_speech,
        example_sentence, source_article_id, source_context,
        mastery_level, review_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'learning', 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        definition = VALUES(definition),
        pronunciation = VALUES(pronunciation),
        example_sentence = VALUES(example_sentence),
        updated_at = NOW()
    `;
    
    const [result] = await pool.execute(query, [
      userId, word.toLowerCase(), definition, pronunciation, part_of_speech,
      example_sentence, source_article_id, source_context
    ]);
    
    return result;
  }
  
  // 获取用户词库列表
  static async getWords(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      mastery_level = null,
      search = null,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE uv.user_id = ?';
    const params = [userId];
    
    if (mastery_level && mastery_level !== 'all') {
      whereClause += ' AND uv.mastery_level = ?';
      params.push(mastery_level);
    }
    
    if (search) {
      whereClause += ' AND (uv.word LIKE ? OR uv.definition LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const validSortColumns = ['created_at', 'updated_at', 'word', 'review_count'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const query = `
      SELECT 
        uv.*,
        a.title as source_article_title
      FROM user_vocabulary uv
      LEFT JOIN articles a ON uv.source_article_id = a.id
      ${whereClause}
      ORDER BY uv.${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    const [rows] = await pool.execute(query, params);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_vocabulary uv
      ${whereClause}
    `;
    const countParams = params.slice(0, -2);
    const [countResult] = await pool.execute(countQuery, countParams);
    
    return {
      words: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }
  
  // 获取用户词库统计
  static async getStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_words,
        COUNT(CASE WHEN mastery_level = 'learning' THEN 1 END) as learning_count,
        COUNT(CASE WHEN mastery_level = 'familiar' THEN 1 END) as familiar_count,
        COUNT(CASE WHEN mastery_level = 'mastered' THEN 1 END) as mastered_count,
        AVG(review_count) as avg_review_count
      FROM user_vocabulary
      WHERE user_id = ?
    `;
    
    const [rows] = await pool.execute(query, [userId]);
    return rows[0];
  }
  
  // 更新单词熟练度
  static async updateMasteryLevel(userId, word, masteryLevel) {
    const validLevels = ['learning', 'familiar', 'mastered'];
    if (!validLevels.includes(masteryLevel)) {
      throw new Error('Invalid mastery level');
    }
    
    const query = `
      UPDATE user_vocabulary 
      SET mastery_level = ?, updated_at = NOW()
      WHERE user_id = ? AND word = ?
    `;
    
    const [result] = await pool.execute(query, [masteryLevel, userId, word.toLowerCase()]);
    return result.affectedRows > 0;
  }
  
  // 增加复习次数
  static async incrementReviewCount(userId, word) {
    const query = `
      UPDATE user_vocabulary 
      SET review_count = review_count + 1, last_reviewed_at = NOW(), updated_at = NOW()
      WHERE user_id = ? AND word = ?
    `;
    
    const [result] = await pool.execute(query, [userId, word.toLowerCase()]);
    return result.affectedRows > 0;
  }
  
  // 删除单词
  static async deleteWord(userId, word) {
    const query = 'DELETE FROM user_vocabulary WHERE user_id = ? AND word = ?';
    const [result] = await pool.execute(query, [userId, word.toLowerCase()]);
    
    return result.affectedRows > 0;
  }
  
  // 获取需要复习的单词
  static async getWordsForReview(userId, limit = 10) {
    const query = `
      SELECT *
      FROM user_vocabulary
      WHERE user_id = ? 
      AND mastery_level IN ('learning', 'familiar')
      AND (
        last_reviewed_at IS NULL 
        OR last_reviewed_at < DATE_SUB(NOW(), INTERVAL 
          CASE 
            WHEN mastery_level = 'learning' THEN 1
            WHEN mastery_level = 'familiar' THEN 3
            ELSE 7
          END DAY
        )
      )
      ORDER BY last_reviewed_at ASC, created_at ASC
      LIMIT ?
    `;
    
    const [rows] = await pool.execute(query, [userId, limit]);
    return rows;
  }
  
  // 检查单词是否在用户词库中
  static async hasWord(userId, word) {
    const query = 'SELECT id FROM user_vocabulary WHERE user_id = ? AND word = ?';
    const [rows] = await pool.execute(query, [userId, word.toLowerCase()]);
    
    return rows.length > 0;
  }
  
  // 获取单词详情
  static async getWordDetail(userId, word) {
    const query = `
      SELECT 
        uv.*,
        a.title as source_article_title,
        a.id as source_article_id
      FROM user_vocabulary uv
      LEFT JOIN articles a ON uv.source_article_id = a.id
      WHERE uv.user_id = ? AND uv.word = ?
    `;
    
    const [rows] = await pool.execute(query, [userId, word.toLowerCase()]);
    return rows[0] || null;
  }
}

module.exports = UserVocabulary; 