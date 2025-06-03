-- 英语阅读应用数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS enreading CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE enreading;

-- 删除已存在的表（如果存在）
DROP TABLE IF EXISTS reading_sessions;
DROP TABLE IF EXISTS user_vocabulary;
DROP TABLE IF EXISTS reading_records;
DROP TABLE IF EXISTS dictionary_cache;
DROP TABLE IF EXISTS dictionary_sources;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS users;

-- 1. 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) COMMENT '用户表';

-- 2. 文章表
CREATE TABLE articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL COMMENT '文章标题',
    content TEXT NOT NULL COMMENT '文章内容',
    source_url VARCHAR(500) COMMENT '来源URL',
    source_name VARCHAR(100) COMMENT '来源网站',
    category VARCHAR(50) COMMENT '分类',
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate' COMMENT '难度等级',
    word_count INT COMMENT '字数',
    published_at TIMESTAMP COMMENT '发布时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_category (category),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_published (published_at)
) COMMENT '文章表';

-- 3. 阅读记录表
CREATE TABLE reading_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    article_id INT NOT NULL COMMENT '文章ID',
    reading_position INT DEFAULT 0 COMMENT '阅读位置（字符偏移量）',
    reading_progress DECIMAL(5,2) DEFAULT 0 COMMENT '阅读进度百分比',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始阅读时间',
    end_time TIMESTAMP NULL COMMENT '结束阅读时间',
    reading_duration INT DEFAULT 0 COMMENT '阅读时长（秒）',
    is_completed BOOLEAN DEFAULT FALSE COMMENT '是否完成阅读',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_user_article (user_id, article_id),
    INDEX idx_user_time (user_id, start_time)
) COMMENT '阅读记录表';

-- 4. 字典缓存表
CREATE TABLE dictionary_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(100) NOT NULL COMMENT '单词',
    data JSON NOT NULL COMMENT '字典数据（释义、音标、例句等）',
    sources JSON COMMENT '数据来源记录',
    quality_score DECIMAL(3,2) DEFAULT 0 COMMENT '数据质量评分',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    access_count INT DEFAULT 1 COMMENT '访问次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    UNIQUE KEY unique_word (word),
    INDEX idx_word (word),
    INDEX idx_last_updated (last_updated),
    INDEX idx_access_count (access_count),
    INDEX idx_quality_score (quality_score)
) COMMENT '字典缓存表';

-- 5. 用户单词收藏表
CREATE TABLE user_vocabulary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    word VARCHAR(100) NOT NULL COMMENT '收藏的单词',
    article_id INT COMMENT '来源文章ID',
    context TEXT COMMENT '单词在文章中的上下文',
    definition_snapshot JSON COMMENT '添加时的释义快照',
    note TEXT COMMENT '用户自定义笔记',
    mastery_level ENUM('learning', 'familiar', 'mastered') DEFAULT 'learning' COMMENT '掌握程度',
    review_count INT DEFAULT 0 COMMENT '复习次数',
    correct_count INT DEFAULT 0 COMMENT '复习正确次数',
    last_reviewed_at TIMESTAMP NULL COMMENT '最后复习时间',
    next_review_at TIMESTAMP NULL COMMENT '下次复习时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY unique_user_word (user_id, word),
    INDEX idx_user_mastery (user_id, mastery_level),
    INDEX idx_review_time (last_reviewed_at),
    INDEX idx_next_review (next_review_at),
    INDEX idx_word (word),
    INDEX idx_user_id (user_id),
    INDEX idx_article_id (article_id)
) COMMENT '用户单词收藏表';

-- 6. 阅读会话表
CREATE TABLE reading_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '用户ID',
    article_id INT NOT NULL COMMENT '文章ID',
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '会话开始时间',
    session_end TIMESTAMP NULL COMMENT '会话结束时间',
    start_position INT DEFAULT 0 COMMENT '开始位置',
    end_position INT DEFAULT 0 COMMENT '结束位置',
    active_duration INT DEFAULT 0 COMMENT '活跃阅读时长（秒）',
    words_looked_up JSON COMMENT '本次会话查询的单词列表',
    
    INDEX idx_user_session (user_id, session_start),
    INDEX idx_article_session (article_id, session_start),
    INDEX idx_user_id (user_id),
    INDEX idx_article_id (article_id)
) COMMENT '阅读会话表';

-- 7. 字典API配置表
CREATE TABLE dictionary_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '字典源名称',
    priority INT NOT NULL COMMENT '优先级（1=最高）',
    base_url VARCHAR(200) NOT NULL COMMENT '基础URL',
    api_key_encrypted TEXT COMMENT '加密的API密钥',
    rate_limit_per_minute INT DEFAULT 60 COMMENT '每分钟请求限制',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    success_rate DECIMAL(5,2) DEFAULT 100.00 COMMENT '成功率',
    avg_response_time INT DEFAULT 0 COMMENT '平均响应时间（毫秒）',
    last_health_check TIMESTAMP COMMENT '最后健康检查时间',
    total_requests INT DEFAULT 0 COMMENT '总请求数',
    failed_requests INT DEFAULT 0 COMMENT '失败请求数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    UNIQUE KEY unique_name (name),
    INDEX idx_priority (priority),
    INDEX idx_active (is_active),
    INDEX idx_success_rate (success_rate)
) COMMENT '字典API配置表';

-- 插入初始数据

-- 插入测试用户
INSERT INTO users (username, email, password_hash) VALUES 
('testuser', 'test@example.com', '$2b$10$example.hash.for.testing'),
('demo', 'demo@example.com', '$2b$10$example.hash.for.demo');

-- 插入字典源配置
INSERT INTO dictionary_sources (name, priority, base_url, is_active) VALUES 
('oxford', 1, 'https://od-api.oxforddictionaries.com/api/v2', TRUE),
('cambridge', 2, 'https://dictionary.cambridge.org/api/v1', TRUE),
('merriam-webster', 3, 'https://www.dictionaryapi.com/api/v3', TRUE),
('youdao', 4, 'https://openapi.youdao.com/api', TRUE),
('freedict', 5, 'https://api.dictionaryapi.dev/api/v2/entries/en', TRUE);

-- 插入示例文章
INSERT INTO articles (title, content, source_url, source_name, category, difficulty_level, word_count, published_at) VALUES 
(
    'The Future of Artificial Intelligence',
    'Artificial intelligence has been transforming various industries in recent years. From healthcare to finance, AI technologies are reshaping how we work and live. Machine learning algorithms can now process vast amounts of data and make predictions with remarkable accuracy. However, the development of AI also raises important ethical questions about privacy, employment, and decision-making transparency.',
    'https://example.com/ai-future',
    'Tech News',
    'Technology',
    'intermediate',
    58,
    '2024-01-15 10:00:00'
),
(
    'Climate Change and Global Warming',
    'Climate change represents one of the most pressing challenges of our time. Rising global temperatures, melting ice caps, and extreme weather events are clear indicators of environmental changes. Scientists worldwide are working to understand these phenomena and develop solutions to mitigate their impact. Renewable energy sources and sustainable practices are becoming increasingly important.',
    'https://example.com/climate-change',
    'Environmental News',
    'Environment',
    'advanced',
    52,
    '2024-01-14 14:30:00'
);

-- 显示创建的表
SHOW TABLES; 