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
      const definition = await DictionaryService.getWordDefinition(word);
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

  // 获取背诵练习题目
  static async getPracticeQuiz(req, res) {
    try {
      const userId = req.user.id;
      
      const schema = Joi.object({
        mode: Joi.string().valid('definition_to_word', 'chinese_to_word', 'word_to_chinese').required(),
        count: Joi.number().integer().min(1).max(20).default(10)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { mode, count } = value;
      
      // 获取用户词库中的单词
      const userWordsResult = await UserVocabulary.getWords(userId, {
        page: 1,
        limit: count * 4, // 获取更多单词用于生成选项
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      const userWords = userWordsResult.words;

      if (userWords.length < count) {
        return res.status(400).json({
          success: false,
          message: `词库中单词数量不足，至少需要${count}个单词`
        });
      }

      // 随机选择题目单词
      const shuffled = userWords.sort(() => 0.5 - Math.random());
      const questionWords = shuffled.slice(0, count);
      const optionWords = shuffled.slice(count);

      const questions = questionWords.map((word, index) => {
        // 为每个题目生成3个错误选项
        const wrongOptions = optionWords
          .filter(w => w.word !== word.word)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        let question, correctAnswer, options;

        switch (mode) {
          case 'definition_to_word':
            question = word.definition;
            correctAnswer = word.word;
            options = [word.word, ...wrongOptions.map(w => w.word)];
            break;
          
          case 'chinese_to_word':
            // 从definition中提取中文释义（假设格式为"英文释义；中文释义"）
            const chineseDefinition = word.definition.split('；')[1] || word.definition;
            question = chineseDefinition;
            correctAnswer = word.word;
            options = [word.word, ...wrongOptions.map(w => w.word)];
            break;
          
          case 'word_to_chinese':
            question = word.word;
            correctAnswer = word.definition.split('；')[1] || word.definition;
            options = [correctAnswer, ...wrongOptions.map(w => w.definition.split('；')[1] || w.definition)];
            break;
        }

        // 随机打乱选项顺序
        options.sort(() => 0.5 - Math.random());

        return {
          id: index + 1,
          word: word.word,
          question,
          options,
          correctAnswer,
          pronunciation: word.pronunciation,
          part_of_speech: word.part_of_speech
        };
      });

      res.json({
        success: true,
        data: {
          mode,
          questions,
          total: questions.length
        }
      });
    } catch (error) {
      console.error('Get practice quiz error:', error);
      res.status(500).json({
        success: false,
        message: '获取练习题目失败'
      });
    }
  }

  // 提交背诵练习结果
  static async submitPracticeResult(req, res) {
    try {
      const userId = req.user.id;
      
      const schema = Joi.object({
        mode: Joi.string().valid('definition_to_word', 'chinese_to_word', 'word_to_chinese').required(),
        results: Joi.array().items(
          Joi.object({
            word: Joi.string().required(),
            isCorrect: Joi.boolean().required(),
            userAnswer: Joi.string().required(),
            correctAnswer: Joi.string().required()
          })
        ).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { mode, results } = value;
      
      // 更新每个单词的复习记录
      for (const result of results) {
        await UserVocabulary.incrementReviewCount(userId, result.word, result.isCorrect);
      }

      // 计算统计信息
      const totalQuestions = results.length;
      const correctAnswers = results.filter(r => r.isCorrect).length;
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions * 100).toFixed(1) : 0;

      res.json({
        success: true,
        data: {
          mode,
          totalQuestions,
          correctAnswers,
          accuracy: parseFloat(accuracy),
          results
        }
      });
    } catch (error) {
      console.error('Submit practice result error:', error);
      res.status(500).json({
        success: false,
        message: '提交练习结果失败'
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