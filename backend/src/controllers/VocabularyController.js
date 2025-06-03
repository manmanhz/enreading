const Joi = require('joi');
const UserVocabulary = require('../models/UserVocabulary');
const DictionaryService = require('../services/DictionaryService');

class VocabularyController {
  // 添加单词到词库
  static async addWord(req, res) {
    try {
      const userId = req.user.id;
      
      const schema = Joi.object({
        word: Joi.string().required(),
        source_article_id: Joi.number().integer().allow(null),
        source_context: Joi.string().allow('')
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { word, source_article_id, source_context } = value;

      // 检查单词是否已在词库中
      const exists = await UserVocabulary.hasWord(userId, word);
      if (exists) {
        return res.status(409).json({
          success: false,
          message: '单词已在词库中'
        });
      }

      // 从字典服务获取单词定义
      const definition = await DictionaryService.lookup(word);
      if (!definition || !definition.word) {
        return res.status(404).json({
          success: false,
          message: '未找到单词定义'
        });
      }

      // 添加到用户词库
      await UserVocabulary.addWord(userId, {
        word: word.toLowerCase(),
        definition: definition.definitions?.[0]?.definition || '',
        pronunciation: definition.pronunciation || '',
        part_of_speech: definition.definitions?.[0]?.part_of_speech || '',
        example_sentence: definition.definitions?.[0]?.examples?.[0] || '',
        source_article_id,
        source_context
      });

      res.status(201).json({
        success: true,
        message: '单词已添加到词库',
        data: definition
      });

    } catch (error) {
      console.error('添加单词错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户词库
  static async getWords(req, res) {
    try {
      const userId = req.user.id;
      
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        mastery_level: Joi.string().valid('all', 'learning', 'familiar', 'mastered').default('all'),
        search: Joi.string().allow(''),
        sort_by: Joi.string().valid('created_at', 'updated_at', 'word', 'review_count').default('created_at'),
        sort_order: Joi.string().valid('ASC', 'DESC').default('DESC')
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await UserVocabulary.getWords(userId, value);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('获取词库错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取词库统计
  static async getStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await UserVocabulary.getStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('获取词库统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新单词熟练度
  static async updateMastery(req, res) {
    try {
      const userId = req.user.id;
      const { word } = req.params;
      
      const schema = Joi.object({
        mastery_level: Joi.string().valid('learning', 'familiar', 'mastered').required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const success = await UserVocabulary.updateMasteryLevel(userId, word, value.mastery_level);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '单词不存在'
        });
      }

      res.json({
        success: true,
        message: '熟练度已更新'
      });

    } catch (error) {
      console.error('更新熟练度错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 复习单词
  static async reviewWord(req, res) {
    try {
      const userId = req.user.id;
      const { word } = req.params;

      const success = await UserVocabulary.incrementReviewCount(userId, word);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '单词不存在'
        });
      }

      res.json({
        success: true,
        message: '复习记录已更新'
      });

    } catch (error) {
      console.error('复习单词错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 删除单词
  static async deleteWord(req, res) {
    try {
      const userId = req.user.id;
      const { word } = req.params;

      const success = await UserVocabulary.deleteWord(userId, word);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '单词不存在'
        });
      }

      res.json({
        success: true,
        message: '单词已删除'
      });

    } catch (error) {
      console.error('删除单词错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取需要复习的单词
  static async getReviewWords(req, res) {
    try {
      const userId = req.user.id;
      
      const schema = Joi.object({
        limit: Joi.number().integer().min(1).max(50).default(10)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const words = await UserVocabulary.getWordsForReview(userId, value.limit);

      res.json({
        success: true,
        data: words
      });

    } catch (error) {
      console.error('获取复习单词错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取单词详情
  static async getWordDetail(req, res) {
    try {
      const userId = req.user.id;
      const { word } = req.params;

      const wordDetail = await UserVocabulary.getWordDetail(userId, word);
      if (!wordDetail) {
        return res.status(404).json({
          success: false,
          message: '单词不存在'
        });
      }

      res.json({
        success: true,
        data: wordDetail
      });

    } catch (error) {
      console.error('获取单词详情错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 批量添加单词
  static async batchAdd(req, res) {
    try {
      const userId = req.user.id;
      
      const schema = Joi.object({
        words: Joi.array().items(
          Joi.object({
            word: Joi.string().required(),
            source_article_id: Joi.number().integer().allow(null),
            source_context: Joi.string().allow('')
          })
        ).min(1).max(20).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const results = {
        success: 0,
        failed: 0,
        details: []
      };

      for (const wordData of value.words) {
        try {
          const { word, source_article_id, source_context } = wordData;
          
          // 检查单词是否已存在
          const exists = await UserVocabulary.hasWord(userId, word);
          if (exists) {
            results.failed++;
            results.details.push({
              word,
              status: 'failed',
              reason: '单词已存在'
            });
            continue;
          }

          // 获取定义
          const definition = await DictionaryService.lookup(word);
          if (!definition || !definition.word) {
            results.failed++;
            results.details.push({
              word,
              status: 'failed',
              reason: '未找到定义'
            });
            continue;
          }

          // 添加到词库
          await UserVocabulary.addWord(userId, {
            word: word.toLowerCase(),
            definition: definition.definitions?.[0]?.definition || '',
            pronunciation: definition.pronunciation || '',
            part_of_speech: definition.definitions?.[0]?.part_of_speech || '',
            example_sentence: definition.definitions?.[0]?.examples?.[0] || '',
            source_article_id,
            source_context
          });

          results.success++;
          results.details.push({
            word,
            status: 'success'
          });

        } catch (error) {
          results.failed++;
          results.details.push({
            word: wordData.word,
            status: 'failed',
            reason: '处理错误'
          });
        }
      }

      res.json({
        success: true,
        message: `批量添加完成：成功 ${results.success} 个，失败 ${results.failed} 个`,
        data: results
      });

    } catch (error) {
      console.error('批量添加单词错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = VocabularyController; 