const express = require('express');
const rateLimit = require('express-rate-limit');
const VocabularyController = require('../controllers/VocabularyController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 词库操作限流
const vocabLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: '词库操作过于频繁，请稍后再试'
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     VocabularyWord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         word:
 *           type: string
 *         definition:
 *           type: string
 *         pronunciation:
 *           type: string
 *         part_of_speech:
 *           type: string
 *         example_sentence:
 *           type: string
 *         source_article_id:
 *           type: integer
 *         source_context:
 *           type: string
 *         mastery_level:
 *           type: string
 *           enum: [learning, familiar, mastered]
 *         review_count:
 *           type: integer
 *         last_reviewed_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/vocabulary:
 *   get:
 *     summary: 获取用户词库
 *     tags: [词库]
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
 *         name: mastery_level
 *         schema:
 *           type: string
 *           enum: [all, learning, familiar, mastered]
 *           default: all
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, word, review_count]
 *           default: created_at
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/', vocabLimiter, authenticateToken, VocabularyController.getWords);

/**
 * @swagger
 * /api/vocabulary/stats:
 *   get:
 *     summary: 获取词库统计
 *     tags: [词库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/stats', vocabLimiter, authenticateToken, VocabularyController.getStats);

/**
 * @swagger
 * /api/vocabulary/review:
 *   get:
 *     summary: 获取需要复习的单词
 *     tags: [词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/review', vocabLimiter, authenticateToken, VocabularyController.getReviewWords);

/**
 * @swagger
 * /api/vocabulary/{word}:
 *   get:
 *     summary: 获取单词详情
 *     tags: [词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 单词不存在
 */
router.get('/:word', vocabLimiter, authenticateToken, VocabularyController.getWordDetail);

/**
 * @swagger
 * /api/vocabulary:
 *   post:
 *     summary: 添加单词到词库
 *     tags: [词库]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - word
 *             properties:
 *               word:
 *                 type: string
 *               source_article_id:
 *                 type: integer
 *               source_context:
 *                 type: string
 *     responses:
 *       201:
 *         description: 添加成功
 *       409:
 *         description: 单词已存在
 */
router.post('/', vocabLimiter, authenticateToken, VocabularyController.addWord);

/**
 * @swagger
 * /api/vocabulary/batch:
 *   post:
 *     summary: 批量添加单词
 *     tags: [词库]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - words
 *             properties:
 *               words:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - word
 *                   properties:
 *                     word:
 *                       type: string
 *                     source_article_id:
 *                       type: integer
 *                     source_context:
 *                       type: string
 *     responses:
 *       200:
 *         description: 批量添加完成
 */
router.post('/batch', vocabLimiter, authenticateToken, VocabularyController.batchAdd);

/**
 * @swagger
 * /api/vocabulary/{word}/mastery:
 *   put:
 *     summary: 更新单词熟练度
 *     tags: [词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mastery_level
 *             properties:
 *               mastery_level:
 *                 type: string
 *                 enum: [learning, familiar, mastered]
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 单词不存在
 */
router.put('/:word/mastery', vocabLimiter, authenticateToken, VocabularyController.updateMastery);

/**
 * @swagger
 * /api/vocabulary/{word}/review:
 *   post:
 *     summary: 标记单词为已复习
 *     tags: [词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 复习记录已更新
 *       404:
 *         description: 单词不存在
 */
router.post('/:word/review', vocabLimiter, authenticateToken, VocabularyController.reviewWord);

/**
 * @swagger
 * /api/vocabulary/{word}:
 *   delete:
 *     summary: 删除单词
 *     tags: [词库]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 单词不存在
 */
router.delete('/:word', vocabLimiter, authenticateToken, VocabularyController.deleteWord);

module.exports = router; 