const Joi = require('joi');
const Article = require('../models/Article');
const ReadingRecord = require('../models/ReadingRecord');

class ArticleController {
  // 获取文章列表
  static async getList(req, res) {
    try {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(10),
        category: Joi.string().allow(''),
        difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const userId = req.user?.userId;
      const result = await Article.getList({
        ...value,
        userId
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('获取文章列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取文章详情
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: '无效的文章ID'
        });
      }

      const article = await Article.getById(id, userId);
      if (!article) {
        return res.status(404).json({
          success: false,
          message: '文章不存在'
        });
      }

      res.json({
        success: true,
        data: article
      });

    } catch (error) {
      console.error('获取文章详情错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 创建文章（管理员功能）
  static async create(req, res) {
    try {
      const schema = Joi.object({
        title: Joi.string().required(),
        content: Joi.string().required(),
        summary: Joi.string().required(),
        category: Joi.string().required(),
        difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
        estimated_time: Joi.number().integer().min(1).required(),
        source_url: Joi.string().uri().allow(''),
        source_name: Joi.string().allow(''),
        image_url: Joi.string().uri().allow(''),
        tags: Joi.array().items(Joi.string())
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const articleId = await Article.create(value);

      res.status(201).json({
        success: true,
        message: '文章创建成功',
        data: { id: articleId }
      });

    } catch (error) {
      console.error('创建文章错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新文章（管理员功能）
  static async update(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: '无效的文章ID'
        });
      }

      const schema = Joi.object({
        title: Joi.string(),
        content: Joi.string(),
        summary: Joi.string(),
        category: Joi.string(),
        difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
        estimated_time: Joi.number().integer().min(1),
        source_url: Joi.string().uri().allow(''),
        source_name: Joi.string().allow(''),
        image_url: Joi.string().uri().allow(''),
        tags: Joi.array().items(Joi.string())
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const success = await Article.update(id, value);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '文章不存在或更新失败'
        });
      }

      res.json({
        success: true,
        message: '文章更新成功'
      });

    } catch (error) {
      console.error('更新文章错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 删除文章（管理员功能）
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: '无效的文章ID'
        });
      }

      const success = await Article.delete(id);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '文章不存在'
        });
      }

      res.json({
        success: true,
        message: '文章删除成功'
      });

    } catch (error) {
      console.error('删除文章错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取分类列表
  static async getCategories(req, res) {
    try {
      const categories = await Article.getCategories();

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      console.error('获取分类列表错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 搜索文章
  static async search(req, res) {
    try {
      const schema = Joi.object({
        q: Joi.string().required(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(50).default(10)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { q: keyword, page, limit } = value;
      const articles = await Article.search(keyword, { page, limit });

      res.json({
        success: true,
        data: {
          articles,
          keyword,
          page,
          limit
        }
      });

    } catch (error) {
      console.error('搜索文章错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新阅读进度
  static async updateProgress(req, res) {
    try {
      const userId = req.user.id;
      const { id: articleId } = req.params;

      if (!articleId || isNaN(parseInt(articleId))) {
        return res.status(400).json({
          success: false,
          message: '无效的文章ID'
        });
      }

      const schema = Joi.object({
        reading_progress: Joi.number().min(0).max(100).required(),
        reading_position: Joi.number().min(0).default(0),
        reading_duration: Joi.number().min(0).default(0),
        is_completed: Joi.boolean().default(false)
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      // 检查文章是否存在
      const article = await Article.getById(articleId);
      if (!article) {
        return res.status(404).json({
          success: false,
          message: '文章不存在'
        });
      }

      // 自动判断是否完成
      if (value.reading_progress >= 100) {
        value.is_completed = true;
        value.end_time = new Date().toISOString();
      }

      // 更新阅读记录
      await ReadingRecord.upsert(userId, articleId, value);

      res.json({
        success: true,
        message: '阅读进度已更新',
        data: value
      });

    } catch (error) {
      console.error('更新阅读进度错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取热门文章
  static async getPopular(req, res) {
    try {
      const schema = Joi.object({
        limit: Joi.number().integer().min(1).max(20).default(10)
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const articles = await ReadingRecord.getPopularArticles(value.limit);

      res.json({
        success: true,
        data: articles
      });

    } catch (error) {
      console.error('获取热门文章错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = ArticleController; 