# 英语阅读应用 - 数据库设计

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
    INDEX idx_user_article (user_id, article_id),
    INDEX idx_user_time (user_id, start_time)
);
```

### 4. 字典缓存表 (Dictionary_Cache)
```sql
-- 缓存外部字典API的查询结果
CREATE TABLE dictionary_cache (
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
);
```

### 5. 用户单词收藏表 (User_Vocabulary)
```sql
-- 用户收藏的单词，不再依赖vocabulary表
CREATE TABLE user_vocabulary (
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
    active_duration INT DEFAULT 0, -- 活跃阅读时长（秒）
    words_looked_up JSON, -- 本次会话查询的单词列表
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_user_session (user_id, session_start),
    INDEX idx_article_session (article_id, session_start)
);
```

### 7. 字典API配置表 (Dictionary_Sources)
```sql
-- 管理外部字典API的配置和状态
CREATE TABLE dictionary_sources (
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
);
```

## 实体关系图 (ER图)

```
Users (1) --------< (M) Reading_Records >-------- (1) Articles
  |                                                      |
  |                                                      |
  | (1)                                              (M) |
  |                                                      |
  v (M)                                                  v
User_Vocabulary                                  Reading_Sessions
        |                                                |
        |                                                |
        | (查询)                                      (M) |
        +---------> Dictionary_Cache                     |
                           |                             |
                           |                             |
                           v                             |
                  Dictionary_Sources                     |
                           |                             |
                           +-------------< (1) Users ----+
```

## 关系说明

1. **Users - Reading_Records (1:M)**
   - 一个用户可以有多条阅读记录
   - 每条阅读记录属于一个用户

2. **Articles - Reading_Records (1:M)**
   - 一篇文章可以被多个用户阅读
   - 每条阅读记录关联一篇文章

3. **Users - User_Vocabulary (1:M)**
   - 一个用户可以收藏多个单词
   - 每个收藏记录属于一个用户

4. **Articles - User_Vocabulary (1:M)**
   - 一篇文章中可以产生多个单词收藏
   - 每个单词收藏可能来源于一篇文章

5. **User_Vocabulary - Dictionary_Cache (M:1 查询关系)**
   - 用户单词通过查询关系获取释义数据
   - 字典缓存为多个用户的单词提供数据

6. **Dictionary_Cache - Dictionary_Sources (查询关系)**
   - 缓存数据来源于多个外部字典API
   - 字典源配置管理外部API的状态

7. **Users - Reading_Sessions (1:M)**
   - 一个用户可以有多个阅读会话
   - 每个阅读会话属于一个用户

## 核心业务逻辑

### 字典查询流程
1. **缓存优先**: 先查询 `Dictionary_Cache` 表
2. **外部API**: 缓存未命中时调用外部字典API
3. **数据合并**: 整合多个字典源的结果
4. **缓存存储**: 将结果存入缓存表供后续使用

### 用户单词管理
- 用户点击单词时，从缓存或外部API获取释义
- 添加到个人单词库时，在 `User_Vocabulary` 表创建记录
- 保存释义快照防止外部API数据变化影响用户数据
- 支持间隔重复算法的智能复习提醒

### 阅读进度追踪
- 通过 `reading_position` 记录用户在文章中的精确位置
- 通过 `reading_progress` 计算并存储阅读百分比
- 通过 `Reading_Sessions` 详细追踪每次阅读会话
- 记录会话中查询的单词，用于学习分析

### 字典服务监控
- `Dictionary_Sources` 表管理API配置和健康状态
- 实时监控API响应时间和成功率
- 支持动态调整API优先级和熔断机制

### 数据质量保证
- 字典缓存包含质量评分，优先返回高质量数据
- 支持数据版本管理和更新策略
- 访问计数支持LRU缓存清理策略

## 性能优化策略

### 缓存分层
1. **一级缓存**: Redis (30分钟，热点数据)
2. **二级缓存**: MySQL Dictionary_Cache (永久，全量数据)
3. **三级缓存**: 本地内存缓存 (5分钟，超热点数据)

### 数据预加载
- 文章发布时预加载可能的生词
- 用户阅读时批量预加载后续段落的单词
- 智能预测用户可能查询的单词

### 分表策略
- `Reading_Records`: 按年份分表
- `Reading_Sessions`: 按月份分表  
- `Dictionary_Cache`: 按单词首字母分表

这个调整后的设计充分利用外部专业字典API，通过多层缓存确保性能，同时保持数据的准确性和实时性。 