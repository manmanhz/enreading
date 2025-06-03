const express = require('express');
const rateLimit = require('express-rate-limit');
const ArticleController = require('../controllers/ArticleController');
const { authenticateToken, optionalAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 通用限流
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每15分钟最多100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 管理操作限流
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: '管理操作过于频繁，请稍后再试'
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Article:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 文章ID
 *         title:
 *           type: string
 *           description: 文章标题
 *         content:
 *           type: string
 *           description: 文章内容
 *         summary:
 *           type: string
 *           description: 文章摘要
 *         category:
 *           type: string
 *           description: 文章分类
 *         difficulty:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           description: 难度等级
 *         estimated_time:
 *           type: integer
 *           description: 预估阅读时间（分钟）
 *         source_url:
 *           type: string
 *           description: 来源链接
 *         source_name:
 *           type: string
 *           description: 来源名称
 *         image_url:
 *           type: string
 *           description: 封面图片URL
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 标签列表
 *         reading_progress:
 *           type: number
 *           description: 阅读进度（0-100）
 *         is_started:
 *           type: boolean
 *           description: 是否已开始阅读
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: 获取文章列表
 *     tags: [文章]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类筛选
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: 难度筛选
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     articles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Article'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', generalLimiter, optionalAuth, ArticleController.getList);

/**
 * @swagger
 * /api/articles/categories:
 *   get:
 *     summary: 获取文章分类列表
 *     tags: [文章]
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/categories', generalLimiter, ArticleController.getCategories);

/**
 * @swagger
 * /api/articles/popular:
 *   get:
 *     summary: 获取热门文章
 *     tags: [文章]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/popular', generalLimiter, ArticleController.getPopular);

/**
 * @swagger
 * /api/articles/search:
 *   get:
 *     summary: 搜索文章
 *     tags: [文章]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 搜索成功
 */
router.get('/search', generalLimiter, ArticleController.search);

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: 获取文章详情
 *     tags: [文章]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文章ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 文章不存在
 */
router.get('/:id', generalLimiter, optionalAuth, ArticleController.getById);

/**
 * @swagger
 * /api/articles/{id}/progress:
 *   post:
 *     summary: 更新阅读进度
 *     tags: [文章]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 文章ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - progress
 *             properties:
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: 阅读进度百分比
 *               last_position:
 *                 type: number
 *                 minimum: 0
 *                 description: 最后阅读位置
 *               reading_time:
 *                 type: number
 *                 minimum: 0
 *                 description: 本次阅读时长（秒）
 *               is_completed:
 *                 type: boolean
 *                 description: 是否完成阅读
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 文章不存在
 */
router.post('/:id/progress', generalLimiter, authenticateToken, ArticleController.updateProgress);

// 管理员功能
/**
 * @swagger
 * /api/articles:
 *   post:
 *     summary: 创建文章（管理员）
 *     tags: [文章管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - summary
 *               - category
 *               - difficulty
 *               - estimated_time
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               summary:
 *                 type: string
 *               category:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               estimated_time:
 *                 type: integer
 *                 minimum: 1
 *               source_url:
 *                 type: string
 *               source_name:
 *                 type: string
 *               image_url:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', adminLimiter, authenticateToken, requireAdmin, ArticleController.create);

/**
 * @swagger
 * /api/articles/{id}:
 *   put:
 *     summary: 更新文章（管理员）
 *     tags: [文章管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', adminLimiter, authenticateToken, requireAdmin, ArticleController.update);

/**
 * @swagger
 * /api/articles/{id}:
 *   delete:
 *     summary: 删除文章（管理员）
 *     tags: [文章管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', adminLimiter, authenticateToken, requireAdmin, ArticleController.delete);

module.exports = router; 