const express = require('express');
const rateLimit = require('express-rate-limit');
const dictionaryController = require('../controllers/DictionaryController');

const router = express.Router();

// 字典查询限流配置
const dictionaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: {
    success: false,
    error: 'Too many dictionary requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 批量查询限流（更严格）
const batchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20, // 每个IP最多20次批量请求
  message: {
    success: false,
    error: 'Too many batch requests, please try again later.'
  }
});

// 应用限流中间件
router.use(dictionaryLimiter);

/**
 * @swagger
 * /api/dictionary/define/{word}:
 *   get:
 *     summary: 获取单词释义
 *     description: 查询单词的详细释义，包括音标、定义、例句等
 *     parameters:
 *       - name: word
 *         in: path
 *         required: true
 *         description: 要查询的单词
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *       - name: format
 *         in: query
 *         description: 返回格式
 *         schema:
 *           type: string
 *           enum: [mobile, web]
 *           default: mobile
 *       - name: refresh
 *         in: query
 *         description: 是否强制刷新缓存
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *     responses:
 *       200:
 *         description: 成功返回单词释义
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
 *                     word:
 *                       type: string
 *                     phonetic:
 *                       type: string
 *                     definitions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           partOfSpeech:
 *                             type: string
 *                           definition:
 *                             type: string
 *                     examples:
 *                       type: array
 *                       items:
 *                         type: string
 *                     audio:
 *                       type: string
 *                 cached:
 *                   type: boolean
 *       400:
 *         description: 参数错误
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器错误
 */
router.get('/define/:word', dictionaryController.getWordDefinition);

/**
 * @swagger
 * /api/dictionary/batch:
 *   post:
 *     summary: 批量获取单词释义
 *     description: 一次性查询多个单词的释义
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               words:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 20
 *             required:
 *               - words
 *     responses:
 *       200:
 *         description: 成功返回批量查询结果
 *       400:
 *         description: 参数错误
 *       429:
 *         description: 请求过于频繁
 */
router.post('/batch', batchLimiter, dictionaryController.batchGetDefinitions);

/**
 * @swagger
 * /api/dictionary/search:
 *   get:
 *     summary: 搜索单词建议
 *     description: 根据输入前缀搜索相似单词
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         description: 搜索查询词
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *       - name: limit
 *         in: query
 *         description: 返回结果数量限制
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *     responses:
 *       200:
 *         description: 成功返回搜索建议
 */
router.get('/search', dictionaryController.searchWords);

/**
 * @swagger
 * /api/dictionary/popular:
 *   get:
 *     summary: 获取热门单词
 *     description: 获取最近最热门的单词列表
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: 返回结果数量
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - name: category
 *         in: query
 *         description: 单词分类
 *         schema:
 *           type: string
 *           enum: [daily, academic, business]
 *     responses:
 *       200:
 *         description: 成功返回热门单词列表
 */
router.get('/popular', dictionaryController.getPopularWords);

/**
 * @swagger
 * /api/dictionary/preload:
 *   post:
 *     summary: 预加载文章单词
 *     description: 预加载文章中的生词到缓存
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10000
 *                 description: 文章内容
 *             required:
 *               - content
 *     responses:
 *       200:
 *         description: 预加载任务已启动
 */
router.post('/preload', dictionaryController.preloadArticleWords);

/**
 * @swagger
 * /api/dictionary/status:
 *   get:
 *     summary: 获取字典服务状态
 *     description: 获取各个字典源的状态和缓存统计
 *     responses:
 *       200:
 *         description: 成功返回服务状态
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
 *                     sources:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           priority:
 *                             type: integer
 *                           is_active:
 *                             type: boolean
 *                           success_rate:
 *                             type: number
 *                           avg_response_time:
 *                             type: integer
 *                           total_requests:
 *                             type: integer
 *                     cacheStats:
 *                       type: object
 *                       properties:
 *                         total_cached_words:
 *                           type: integer
 *                         total_accesses:
 *                           type: integer
 *                         avg_quality:
 *                           type: number
 *                         popular_words:
 *                           type: integer
 */
router.get('/status', dictionaryController.getDictionaryStatus);

module.exports = router; 