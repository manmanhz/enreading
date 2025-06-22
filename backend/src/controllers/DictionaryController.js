const dictionaryService = require('../services/DictionaryService');
const Joi = require('joi');

class DictionaryController {
  
  // 获取单词释义
  async getWordDefinition(req, res) {
    try {
      // 参数验证
      const schema = Joi.object({
        word: Joi.string().alphanum().min(1).max(50).required()
      });

      const { error } = schema.validate(req.params);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { word } = req.params;
      const { format = 'mobile', refresh = 'false' } = req.query;
      
      const definition = await dictionaryService.getWordDefinition(word, {
        format,
        useCache: refresh !== 'true'
      });

      res.json({
        success: true,
        data: definition,
        cached: definition._cached || false
      });
    } catch (error) {
      console.error('Dictionary lookup failed:', error);
      
      // 返回降级结果
      const fallbackDefinition = {
        word: req.params.word,
        phonetic: null,
        definitions: [{
          partOfSpeech: 'unknown',
          definition: '暂时无法获取释义，请稍后重试'
        }],
        examples: [],
        audio: null,
        sources: ['fallback'],
        quality: 0,
        fallback: true,
        timestamp: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: fallbackDefinition,
        fallback: true,
        error: error.message
      });
    }
  }

  // 批量获取单词释义
  async batchGetDefinitions(req, res) {
    try {
      // 参数验证
      const schema = Joi.object({
        words: Joi.array().items(Joi.string().alphanum().min(1).max(50)).min(1).max(20).required()
      });

      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { words } = req.body;
      
      // 并行处理多个单词
      const results = await Promise.allSettled(
        words.map(word => dictionaryService.getWordDefinition(word))
      );

      const definitions = results.map((result, index) => ({
        word: words[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));

      res.json({
        success: true,
        data: definitions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 搜索相似单词
  async searchWords(req, res) {
    try {
      const schema = Joi.object({
        query: Joi.string().min(1).max(50).required(),
        limit: Joi.number().integer().min(1).max(20).default(10)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { query, limit } = value;
      
      // 从缓存中搜索相似单词
      const { pool } = require('../config/database');
      const [rows] = await pool.execute(`
        SELECT word, JSON_EXTRACT(data, '$.phonetic') as phonetic 
        FROM dictionary_cache 
        WHERE word LIKE ? 
        ORDER BY access_count DESC, word
        LIMIT ${limit} 
      `, [`${query}%`]);

      const suggestions = rows.map(row => ({
        word: row.word,
        phonetic: row.phonetic
      }));

      res.json({
        success: true,
        data: {
          query,
          suggestions
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 获取热门单词
  async getPopularWords(req, res) {
    try {
      const schema = Joi.object({
        limit: Joi.number().integer().min(1).max(50).default(20),
        category: Joi.string().valid('daily', 'academic', 'business').optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { limit } = value;
      
      const { pool } = require('../config/database');
      const [rows] = await pool.execute(`
        SELECT 
          word, 
          JSON_EXTRACT(data, '$.phonetic') as phonetic,
          JSON_EXTRACT(data, '$.definitions[0].definition') as definition,
          access_count
        FROM dictionary_cache 
        WHERE access_count > 5
        ORDER BY access_count DESC 
        LIMIT ${limit}
      `);

      const popularWords = rows.map(row => ({
        word: row.word,
        phonetic: row.phonetic,
        definition: row.definition,
        accessCount: row.access_count
      }));

      res.json({
        success: true,
        data: popularWords
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 预加载文章中的单词
  async preloadArticleWords(req, res) {
    try {
      const schema = Joi.object({
        content: Joi.string().min(1).max(10000).required()
      });

      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const { content } = req.body;
      
      // 提取英文单词
      const words = content.match(/\b[a-zA-Z]{3,}\b/g) || [];
      const uniqueWords = [...new Set(words)]
        .map(word => word.toLowerCase())
        .filter(word => !this.isCommonWord(word))
        .slice(0, 50); // 限制数量

      // 后台异步预加载
      setImmediate(async () => {
        try {
          await Promise.all(
            uniqueWords.map(word => 
              dictionaryService.getWordDefinition(word).catch(() => {})
            )
          );
        } catch (error) {
          console.error('Preload failed:', error);
        }
      });

      res.json({
        success: true,
        data: {
          wordsFound: uniqueWords.length,
          message: 'Words are being preloaded in background'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 检查是否为常用词
  isCommonWord(word) {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ]);
    
    return commonWords.has(word.toLowerCase()) || word.length < 3;
  }

  // 获取字典服务状态
  async getDictionaryStatus(req, res) {
    try {
      const { pool } = require('../config/database');
      const [sources] = await pool.execute(`
        SELECT name, priority, is_active, success_rate, avg_response_time, total_requests
        FROM dictionary_sources
        ORDER BY priority
      `);

      res.json({
        success: true,
        data: {
          sources,
          cacheStats: await this.getCacheStats()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 获取缓存统计
  async getCacheStats() {
    try {
      const { pool } = require('../config/database');
      const [stats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_cached_words,
          SUM(access_count) as total_accesses,
          AVG(quality_score) as avg_quality,
          COUNT(CASE WHEN access_count > 10 THEN 1 END) as popular_words
        FROM dictionary_cache
      `);

      return stats[0] || {
        total_cached_words: 0,
        total_accesses: 0,
        avg_quality: 0,
        popular_words: 0
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {};
    }
  }
}

module.exports = new DictionaryController(); 