# 英语阅读应用 - 数据库设计 (无外键版本)

## 核心实体设计

### 1. 用户表 (Users)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. 文章表 (Articles)
```sql
CREATE TABLE articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    source_url VARCHAR(500),
    source_name VARCHAR(100),
    category VARCHAR(50),
    difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    word_count INT,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_published (published_at)
);
```

### 3. 阅读记录表 (Reading_Records)
```sql
CREATE TABLE reading_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    article_id INT NOT NULL,
    reading_position INT DEFAULT 0,
    reading_progress DECIMAL(5,2) DEFAULT 0,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    reading_duration INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_article (user_id, article_id),
    INDEX idx_user_time (user_id, start_time)
);
```

### 4. 字典缓存表 (Dictionary_Cache)
```sql
CREATE TABLE dictionary_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(100) NOT NULL,
    data JSON NOT NULL,
    sources JSON,
    quality_score DECIMAL(3,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    access_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_word (word),
    INDEX idx_word (word),
    INDEX idx_last_updated (last_updated),
    INDEX idx_access_count (access_count),
    INDEX idx_quality_score (quality_score)
);
```

### 5. 用户单词收藏表 (User_Vocabulary)
```sql
CREATE TABLE user_vocabulary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    word VARCHAR(100) NOT NULL,
    article_id INT,
    context TEXT,
    definition_snapshot JSON,
    note TEXT,
    mastery_level ENUM('learning', 'familiar', 'mastered') DEFAULT 'learning',
    review_count INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    last_reviewed_at TIMESTAMP NULL,
    next_review_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_word (user_id, word),
    INDEX idx_user_mastery (user_id, mastery_level),
    INDEX idx_review_time (last_reviewed_at),
    INDEX idx_next_review (next_review_at),
    INDEX idx_word (word),
    INDEX idx_user_id (user_id),
    INDEX idx_article_id (article_id)
);
```

### 6. 阅读会话表 (Reading_Sessions)
```sql
CREATE TABLE reading_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    article_id INT NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP NULL,
    start_position INT DEFAULT 0,
    end_position INT DEFAULT 0,
    active_duration INT DEFAULT 0,
    words_looked_up JSON,
    
    INDEX idx_user_session (user_id, session_start),
    INDEX idx_article_session (article_id, session_start),
    INDEX idx_user_id (user_id),
    INDEX idx_article_id (article_id)
);
```

### 7. 字典API配置表 (Dictionary_Sources)
```sql
CREATE TABLE dictionary_sources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    priority INT NOT NULL,
    base_url VARCHAR(200) NOT NULL,
    api_key_encrypted TEXT,
    rate_limit_per_minute INT DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    avg_response_time INT DEFAULT 0,
    last_health_check TIMESTAMP,
    total_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_name (name),
    INDEX idx_priority (priority),
    INDEX idx_active (is_active),
    INDEX idx_success_rate (success_rate)
);
```

## 数据完整性说明

由于移除了外键约束，数据完整性将在应用层面保证：

1. **应用层约束**：在业务逻辑中验证关联数据的存在性
2. **软删除机制**：使用标记删除而非物理删除
3. **数据清理任务**：定期清理孤立数据
4. **事务处理**：使用数据库事务确保操作的原子性 