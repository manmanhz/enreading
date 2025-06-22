-- 创建数据库
CREATE DATABASE IF NOT EXISTS enreading CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE enreading;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE=InnoDB;

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    source_url VARCHAR(500),
    source_name VARCHAR(100),
    category VARCHAR(50),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    word_count INT DEFAULT 0,
    image_url VARCHAR(500),
    status ENUM('draft', 'published', 'archived') DEFAULT 'published',
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_published (published_at),
    INDEX idx_status (status),
    FULLTEXT idx_search (title, content)
) ENGINE=InnoDB;

-- 阅读记录表
CREATE TABLE IF NOT EXISTS reading_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    article_id INT NOT NULL,
    reading_position INT DEFAULT 0, -- 阅读位置（字符偏移量）
    reading_progress DECIMAL(5,2) DEFAULT 0, -- 阅读进度百分比
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    reading_duration INT DEFAULT 0, -- 阅读时长（秒）
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_article (user_id, article_id),
    INDEX idx_user_article (user_id, article_id),
    INDEX idx_user_time (user_id, start_time),
    INDEX idx_progress (reading_progress),
    INDEX idx_completed (is_completed)
) ENGINE=InnoDB;

-- 字典缓存表
CREATE TABLE IF NOT EXISTS dictionary_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(100) NOT NULL,
    data JSON NOT NULL, -- 存储完整的字典数据（释义、音标、例句等）
    sources JSON, -- 数据来源记录（哪些API提供了数据）
    quality_score DECIMAL(3,2) DEFAULT 0, -- 数据质量评分
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    access_count INT DEFAULT 1, -- 访问次数，用于LRU缓存清理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_word (word),
    INDEX idx_word (word),
    INDEX idx_last_updated (last_updated),
    INDEX idx_access_count (access_count),
    INDEX idx_quality_score (quality_score)
) ENGINE=InnoDB;

-- 用户单词收藏表
CREATE TABLE IF NOT EXISTS user_vocabulary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    word VARCHAR(100) NOT NULL, -- 直接存储单词，不再关联vocabulary表
    article_id INT, -- 从哪篇文章添加的
    context TEXT, -- 单词在文章中的上下文
    definition_snapshot JSON, -- 添加时的释义快照，防止外部API变化
    note TEXT, -- 用户自定义笔记
    mastery_level ENUM('learning', 'familiar', 'mastered') DEFAULT 'learning',
    review_count INT DEFAULT 0,
    correct_count INT DEFAULT 0, -- 复习正确次数
    last_reviewed_at TIMESTAMP NULL,
    next_review_at TIMESTAMP NULL, -- 下次复习时间（间隔重复算法）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_word (user_id, word),
    INDEX idx_user_mastery (user_id, mastery_level),
    INDEX idx_review_time (last_reviewed_at),
    INDEX idx_next_review (next_review_at),
    INDEX idx_word (word)
) ENGINE=InnoDB;

-- 阅读会话表
CREATE TABLE IF NOT EXISTS reading_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    article_id INT NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP NULL,
    start_position INT DEFAULT 0,
    end_position INT DEFAULT 0,
    active_duration INT DEFAULT 0, -- 活跃阅读时长（秒）
    words_looked_up JSON, -- 本次会话查询的单词列表
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_user_session (user_id, session_start),
    INDEX idx_article_session (article_id, session_start)
) ENGINE=InnoDB;

-- 字典API配置表
CREATE TABLE IF NOT EXISTS dictionary_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL, -- 字典源名称 (oxford, cambridge, etc.)
    priority INT NOT NULL, -- 优先级 (1=最高)
    base_url VARCHAR(200) NOT NULL,
    api_key_encrypted TEXT, -- 加密存储的API密钥
    rate_limit_per_minute INT DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    success_rate DECIMAL(5,2) DEFAULT 100.00, -- 成功率统计
    avg_response_time INT DEFAULT 0, -- 平均响应时间(ms)
    last_health_check TIMESTAMP,
    total_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_name (name),
    INDEX idx_priority (priority),
    INDEX idx_active (is_active),
    INDEX idx_success_rate (success_rate)
) ENGINE=InnoDB;

-- 插入一些示例数据

-- 示例文章
INSERT INTO articles (title, content, summary, category, difficulty_level, word_count, status) VALUES
('The Future of Artificial Intelligence', 
'Artificial intelligence has been transforming various industries at an unprecedented pace. Machine learning algorithms are becoming more sophisticated, enabling computers to perform tasks that once required human intelligence. From autonomous vehicles to medical diagnosis, AI applications are expanding rapidly.

The development of large language models has opened new possibilities in natural language processing. These models can understand context, generate human-like responses, and assist in complex reasoning tasks. However, with great power comes great responsibility, and the ethical implications of AI development must be carefully considered.

Privacy concerns, job displacement, and algorithmic bias are among the key challenges that need to be addressed. As we advance toward artificial general intelligence, it is crucial to establish proper regulations and guidelines to ensure AI benefits humanity as a whole.',
'An overview of AI development and its impact on society, covering both opportunities and challenges.',
'Technology', 'intermediate', 1245, 'published'),

('Climate Change and Global Warming', 
'Climate change represents one of the most pressing challenges of our time. Rising global temperatures, melting ice caps, and extreme weather events are clear indicators of our changing climate. The primary cause of this phenomenon is the increased concentration of greenhouse gases in the atmosphere, largely due to human activities.

Carbon dioxide levels have reached unprecedented heights since the Industrial Revolution. Fossil fuel combustion, deforestation, and industrial processes are the main contributors to these emissions. The consequences are far-reaching, affecting ecosystems, food security, and human settlements worldwide.

However, there is hope. Renewable energy technologies are becoming more efficient and affordable. Solar and wind power are now cost-competitive with traditional energy sources in many regions. Additionally, international cooperation through agreements like the Paris Climate Accord demonstrates global commitment to addressing this challenge.',
'An examination of climate change causes, effects, and potential solutions.',
'Environment', 'beginner', 892, 'published'),

('The Renaissance: A Cultural Revolution', 
'The Renaissance, spanning roughly from the 14th to the 17th century, marked a period of unprecedented cultural, artistic, and intellectual revival in Europe. This era witnessed a renewed interest in classical learning, humanism, and scientific inquiry that fundamentally transformed European society.

Florence, often considered the birthplace of the Renaissance, became a center of artistic innovation. Masters like Leonardo da Vinci, Michelangelo, and Raphael created works that continue to inspire and amaze audiences today. Their contributions to art, science, and engineering demonstrated the Renaissance ideal of the "universal man" – someone skilled in multiple disciplines.

The invention of the printing press by Johannes Gutenberg revolutionized the dissemination of knowledge. Books became more accessible, literacy rates increased, and ideas spread more rapidly across Europe. This technological advancement played a crucial role in the Protestant Reformation and the Scientific Revolution that followed.

The Renaissance also saw significant developments in exploration and trade. Figures like Christopher Columbus, Vasco da Gama, and Ferdinand Magellan expanded European knowledge of the world, leading to increased cultural exchange and economic growth.',
'A comprehensive look at the Renaissance period and its lasting impact on Western civilization.',
'History', 'advanced', 1678, 'published');

-- 示例字典源配置
INSERT INTO dictionary_sources (name, priority, base_url, is_active) VALUES
('oxford', 1, 'https://od-api.oxforddictionaries.com/api/v2', TRUE),
('cambridge', 2, 'https://dictionary.cambridge.org/api/v1', TRUE),
('merriam-webster', 3, 'https://www.dictionaryapi.com/api/v3', TRUE),
('free-dictionary', 4, 'https://api.dictionaryapi.dev/api/v2', TRUE);

-- 创建用于全文搜索的视图
-- CREATE VIEW article_search AS
-- SELECT 
--     id,
--     title,
--     content,
--     summary,
--     category,
--     difficulty_level,
--     word_count,
--     created_at,
--     MATCH(title, content) AGAINST('' IN NATURAL LANGUAGE MODE) as relevance
-- FROM articles 
-- WHERE status = 'published';

-- DELIMITER //

-- -- 创建存储过程：计算阅读进度百分比
-- CREATE PROCEDURE CalculateReadingProgress(
--     IN p_user_id INT,
--     IN p_article_id INT,
--     IN p_current_position INT,
--     OUT p_progress DECIMAL(5,2)
-- )
-- BEGIN
--     DECLARE article_length INT DEFAULT 0;
    
--     SELECT CHAR_LENGTH(content) INTO article_length
--     FROM articles 
--     WHERE id = p_article_id;
    
--     IF article_length > 0 THEN
--         SET p_progress = (p_current_position / article_length) * 100;
--         IF p_progress > 100 THEN
--             SET p_progress = 100;
--         END IF;
--     ELSE
--         SET p_progress = 0;
--     END IF;
    
--     -- 更新阅读记录
--     INSERT INTO reading_records (user_id, article_id, reading_position, reading_progress)
--     VALUES (p_user_id, p_article_id, p_current_position, p_progress)
--     ON DUPLICATE KEY UPDATE
--         reading_position = p_current_position,
--         reading_progress = p_progress,
--         updated_at = CURRENT_TIMESTAMP;
-- END //

-- -- 创建触发器：自动更新文章字数
-- CREATE TRIGGER update_word_count
--     BEFORE UPDATE ON articles
--     FOR EACH ROW
-- BEGIN
--     IF NEW.content != OLD.content THEN
--         SET NEW.word_count = (
--             CHAR_LENGTH(NEW.content) - CHAR_LENGTH(REPLACE(NEW.content, ' ', '')) + 1
--         );
--     END IF;
-- END //

-- -- 创建触发器：自动设置阅读完成状态
-- CREATE TRIGGER check_reading_completion
--     BEFORE UPDATE ON reading_records
--     FOR EACH ROW
-- BEGIN
--     IF NEW.reading_progress >= 100 THEN
--         SET NEW.is_completed = TRUE;
--         IF NEW.end_time IS NULL THEN
--             SET NEW.end_time = CURRENT_TIMESTAMP;
--         END IF;
--     END IF;
-- END //

-- DELIMITER ;

-- 创建索引优化查询性能
CREATE INDEX idx_articles_search ON articles(title(50), category, difficulty_level);
CREATE INDEX idx_reading_performance ON reading_records(user_id, reading_progress, is_completed);
CREATE INDEX idx_vocabulary_learning ON user_vocabulary(user_id, mastery_level, next_review_at); 