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
      source_context,
      note
    } = wordData;
    
    // 构建definition_snapshot JSON对象
    const definitionSnapshot = {
      definition: definition || '',
      pronunciation: pronunciation || '',
      part_of_speech: part_of_speech || '',
      example_sentence: example_sentence || ''
    };
    
    const query = `
      INSERT INTO user_vocabulary (
        user_id, word, article_id, context, definition_snapshot, note,
        mastery_level, review_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'learning', 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        definition_snapshot = VALUES(definition_snapshot),
        note = VALUES(note),
        updated_at = NOW()
    `;
    
    const [result] = await pool.execute(query, [
      userId, word.toLowerCase(), source_article_id, source_context, 
      JSON.stringify(definitionSnapshot), note || null
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
      whereClause += ' AND (uv.word LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(uv.definition_snapshot, "$.definition")) LIKE ?)';
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
      LEFT JOIN articles a ON uv.article_id = a.id
      ${whereClause}
      ORDER BY uv.${sortColumn} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    const [rows] = await pool.execute(query, params);
    
    // 解析definition_snapshot JSON字段
    const wordsWithParsedData = rows.map(row => {
      if (row.definition_snapshot) {
        try {
          const snapshot = row.definition_snapshot;
          row.definition = snapshot.definition;
          row.pronunciation = snapshot.pronunciation;
          row.part_of_speech = snapshot.part_of_speech;
          row.example_sentence = snapshot.example_sentence;
        } catch (e) {
          console.error('Error parsing definition_snapshot:', e);
        }
      }
      return row;
    });
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_vocabulary uv
      ${whereClause}
    `;
    // 对于count查询，我们需要所有的WHERE条件参数，但不需要LIMIT和OFFSET
    const countParams = [...params];
    const [countResult] = await pool.execute(countQuery, countParams);
    
    return {
      words: wordsWithParsedData,
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
  static async incrementReviewCount(userId, word, isCorrect = true) {
    // 计算下次复习时间（间隔重复算法）
    const getNextReviewInterval = (reviewCount, isCorrect) => {
      if (!isCorrect) return 1; // 答错了，1天后再复习
      
      // 简单的间隔重复算法
      const intervals = [1, 3, 7, 14, 30, 90]; // 天数
      const index = Math.min(reviewCount, intervals.length - 1);
      return intervals[index];
    };
    
    const query = `
      UPDATE user_vocabulary 
      SET review_count = review_count + 1, 
          correct_count = correct_count + ?,
          last_reviewed_at = NOW(),
          next_review_at = DATE_ADD(NOW(), INTERVAL ? DAY),
          updated_at = NOW()
      WHERE user_id = ? AND word = ?
    `;
    
    // 先获取当前的review_count
    const getCurrentCount = `SELECT review_count FROM user_vocabulary WHERE user_id = ? AND word = ?`;
    const [countResult] = await pool.execute(getCurrentCount, [userId, word.toLowerCase()]);
    const currentCount = countResult[0]?.review_count || 0;
    
    const nextInterval = getNextReviewInterval(currentCount, isCorrect);
    
    const [result] = await pool.execute(query, [
      isCorrect ? 1 : 0, 
      nextInterval,
      userId, 
      word.toLowerCase()
    ]);
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
        next_review_at IS NULL 
        OR next_review_at <= NOW()
        OR last_reviewed_at IS NULL 
        OR last_reviewed_at < DATE_SUB(NOW(), INTERVAL 
          CASE 
            WHEN mastery_level = 'learning' THEN 1
            WHEN mastery_level = 'familiar' THEN 3
            ELSE 7
          END DAY
        )
      )
      ORDER BY next_review_at ASC, last_reviewed_at ASC, created_at ASC
      LIMIT ${limit}
    `;
    
    const [rows] = await pool.execute(query, [userId]);
    
    // 解析definition_snapshot JSON字段
    return rows.map(row => {
      if (row.definition_snapshot) {
        try {
          const snapshot = JSON.parse(row.definition_snapshot);
          row.definition = snapshot.definition;
          row.pronunciation = snapshot.pronunciation;
          row.part_of_speech = snapshot.part_of_speech;
          row.example_sentence = snapshot.example_sentence;
        } catch (e) {
          console.error('Error parsing definition_snapshot:', e);
        }
      }
      return row;
    });
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
      LEFT JOIN articles a ON uv.article_id = a.id
      WHERE uv.user_id = ? AND uv.word = ?
    `;
    
    const [rows] = await pool.execute(query, [userId, word.toLowerCase()]);
    const result = rows[0] || null;
    
    // 解析definition_snapshot JSON字段
    if (result && result.definition_snapshot) {
      try {
        const snapshot = JSON.parse(result.definition_snapshot);
        result.definition = snapshot.definition;
        result.pronunciation = snapshot.pronunciation;
        result.part_of_speech = snapshot.part_of_speech;
        result.example_sentence = snapshot.example_sentence;
      } catch (e) {
        console.error('Error parsing definition_snapshot:', e);
      }
    }
    
    return result;
  }
}

module.exports = UserVocabulary;