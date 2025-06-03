const express = require('express');
const rateLimit = require('express-rate-limit');
const ReadingController = require('../controllers/ReadingController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 阅读记录限流
const readingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ReadingRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         article_id:
 *           type: integer
 *         progress:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         last_position:
 *           type: number
 *         reading_time:
 *           type: integer
 *         is_completed:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         title:
 *           type: string
 *         category:
 *           type: string
 *         difficulty:
 *           type: string
 *         estimated_time:
 *           type: integer
 *         image_url:
 *           type: string
 */

/**
 * @swagger
 * /api/reading/history:
 *   get:
 *     summary: 获取阅读历史
 *     tags: [阅读记录]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReadingRecord'
 */
router.get('/history', readingLimiter, authenticateToken, ReadingController.getHistory);

/**
 * @swagger
 * /api/reading/stats:
 *   get:
 *     summary: 获取阅读统计
 *     tags: [阅读记录]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, all]
 *           default: all
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
 *                     total_articles:
 *                       type: integer
 *                     completed_articles:
 *                       type: integer
 *                     total_reading_time:
 *                       type: integer
 *                     average_progress:
 *                       type: number
 *                     reading_streak:
 *                       type: integer
 *                     last_reading_date:
 *                       type: string
 *                       format: date-time
 */
router.get('/stats', readingLimiter, authenticateToken, ReadingController.getStats);

/**
 * @swagger
 * /api/reading/progress/{articleId}:
 *   get:
 *     summary: 获取特定文章的阅读进度
 *     tags: [阅读记录]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 阅读记录不存在
 */
router.get('/progress/:articleId', readingLimiter, authenticateToken, ReadingController.getProgress);

/**
 * @swagger
 * /api/reading/report:
 *   get:
 *     summary: 获取阅读报告
 *     tags: [阅读记录]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2020
 *           maximum: 2030
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
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
 *                     period:
 *                       type: string
 *                     stats:
 *                       type: object
 *                     daily_stats:
 *                       type: object
 *                     total_records:
 *                       type: integer
 */
router.get('/report', readingLimiter, authenticateToken, ReadingController.getReport);

/**
 * @swagger
 * /api/reading/record/{articleId}:
 *   delete:
 *     summary: 删除阅读记录
 *     tags: [阅读记录]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 阅读记录不存在
 */
router.delete('/record/:articleId', readingLimiter, authenticateToken, ReadingController.deleteRecord);

module.exports = router; 