const Joi = require('joi');
const ReadingRecord = require('../models/ReadingRecord');

class ReadingController {
  // 获取阅读历史
  static async getHistory(req, res) {
    try {
      const userId = req.user.id;
      
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(20),
        start_date: Joi.date().iso(),
        end_date: Joi.date().iso()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const history = await ReadingRecord.getHistory(userId, {
        page: value.page,
        limit: value.limit,
        startDate: value.start_date,
        endDate: value.end_date
      });

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('获取阅读历史错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取阅读统计
  static async getStats(req, res) {
    try {
      const userId = req.user.id;
      
      const schema = Joi.object({
        period: Joi.string().valid('today', 'week', 'month', 'all').default('all')
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const stats = await ReadingRecord.getStats(userId, value.period);
      const streak = await ReadingRecord.getReadingStreak(userId);

      res.json({
        success: true,
        data: {
          ...stats,
          reading_streak: streak
        }
      });

    } catch (error) {
      console.error('获取阅读统计错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取阅读进度
  static async getProgress(req, res) {
    try {
      const userId = req.user.id;
      const { articleId } = req.params;

      if (!articleId || isNaN(parseInt(articleId))) {
        return res.status(400).json({
          success: false,
          message: '无效的文章ID'
        });
      }

      const record = await ReadingRecord.getByUserAndArticle(userId, articleId);

      res.json({
        success: true,
        data: record || {
          reading_progress: 0,
          reading_position: 0,
          reading_duration: 0,
          is_completed: false
        }
      });

    } catch (error) {
      console.error('获取阅读进度错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 删除阅读记录
  static async deleteRecord(req, res) {
    try {
      const userId = req.user.id;
      const { articleId } = req.params;

      if (!articleId || isNaN(parseInt(articleId))) {
        return res.status(400).json({
          success: false,
          message: '无效的文章ID'
        });
      }

      const success = await ReadingRecord.delete(userId, articleId);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '阅读记录不存在'
        });
      }

      res.json({
        success: true,
        message: '阅读记录已删除'
      });

    } catch (error) {
      console.error('删除阅读记录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取阅读报告（月度/年度）
  static async getReport(req, res) {
    try {
      const userId = req.user.id;
      
      const schema = Joi.object({
        year: Joi.number().integer().min(2020).max(2030).default(new Date().getFullYear()),
        month: Joi.number().integer().min(1).max(12)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { year, month } = value;
      
      // 构建日期范围
      let startDate, endDate;
      if (month) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0);
      } else {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
      }

      // 获取期间的阅读记录
      const history = await ReadingRecord.getHistory(userId, {
        page: 1,
        limit: 1000,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      // 获取统计数据
      const stats = await ReadingRecord.getStats(userId, month ? 'month' : 'all');

      // 按日期分组统计
      const dailyStats = {};
      history.forEach(record => {
        const date = record.updated_at.toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {
            articles_read: 0,
            total_time: 0,
            completed_articles: 0
          };
        }
        dailyStats[date].articles_read++;
        dailyStats[date].total_time += record.reading_duration || 0;
        if (record.is_completed) {
          dailyStats[date].completed_articles++;
        }
      });

      res.json({
        success: true,
        data: {
          period: month ? `${year}-${month.toString().padStart(2, '0')}` : year.toString(),
          stats,
          daily_stats: dailyStats,
          total_records: history.length
        }
      });

    } catch (error) {
      console.error('获取阅读报告错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = ReadingController; 