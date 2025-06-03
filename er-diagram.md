# 英语阅读应用 - ER图详细设计

## 实体关系图 (Entity Relationship Diagram)

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                     英语阅读应用 ER图                          │
                    └─────────────────────────────────────────────────────────────┘

    ┌─────────────────┐                                        ┌─────────────────┐
    │     USERS       │                                        │    ARTICLES     │
    ├─────────────────┤                                        ├─────────────────┤
    │ + id (PK)       │                                        │ + id (PK)       │
    │   username      │                                        │   title         │
    │   email         │                                        │   content       │
    │   password_hash │                                        │   source_url    │
    │   created_at    │                                        │   source_name   │
    │   updated_at    │                                        │   category      │
    └─────────────────┘                                        │   difficulty    │
            │                                                  │   word_count    │
            │ 1                                                │   published_at  │
            │                                                  │   created_at    │
            ├─────────────────────────┐                        │   updated_at    │
            │                         │                        └─────────────────┘
            │                         │                               │
            │ M                       │ M                             │ 1
            ▼                         ▼                               ▼
    ┌─────────────────┐       ┌─────────────────┐             ┌─────────────────┐
    │ READING_RECORDS │       │READING_SESSIONS │             │USER_VOCABULARY  │
    ├─────────────────┤       ├─────────────────┤             ├─────────────────┤
    │ + id (PK)       │       │ + id (PK)       │             │ + id (PK)       │
    │ * user_id (FK)  │       │ * user_id (FK)  │             │ * user_id (FK)  │
    │ * article_id(FK)│       │ * article_id(FK)│             │ * vocab_id (FK) │
    │   reading_pos   │       │   session_start │             │ * article_id(FK)│
    │   progress      │       │   session_end   │             │   context       │
    │   start_time    │       │   start_pos     │             │   mastery_level │
    │   end_time      │       │   end_pos       │             │   review_count  │
    │   duration      │       │   active_time   │             │   last_reviewed │
    │   is_completed  │       │   created_at    │             │   created_at    │
    │   created_at    │       └─────────────────┘             │   updated_at    │
    │   updated_at    │                │                       └─────────────────┘
    └─────────────────┘                │                               │
            │                          │                               │ M
            │ M                        │ 1                             │
            │                          │                               ▼
            ▼                          ▼                       ┌─────────────────┐
    ┌─────────────────┐        ┌─────────────────┐             │   VOCABULARY    │
    │    ARTICLES     │        │     USERS       │             ├─────────────────┤
    │    (连接表)      │        │    (连接表)      │             │ + id (PK)       │
    └─────────────────┘        └─────────────────┘             │   word          │
                                                               │   phonetic      │
                                                               │   definition    │
                                                               │   example       │
                                                               │   difficulty    │
                                                               │   created_at    │
                                                               └─────────────────┘
```

## 实体详细说明

### 1. Users (用户实体)
**主要属性：**
- `id`: 主键，用户唯一标识
- `username`: 用户名，唯一约束
- `email`: 邮箱地址，用于登录和通知
- `password_hash`: 加密后的密码
- `created_at/updated_at`: 时间戳

**业务规则：**
- 用户名和邮箱必须唯一
- 密码使用bcrypt加密存储
- 支持软删除机制

### 2. Articles (文章实体)
**主要属性：**
- `id`: 主键，文章唯一标识
- `title`: 文章标题
- `content`: 文章正文内容
- `source_url`: 原文链接
- `source_name`: 来源网站名称
- `category`: 文章分类（科技、财经等）
- `difficulty_level`: 难度等级（初级、中级、高级）
- `word_count`: 字数统计
- `published_at`: 原文发布时间

**业务规则：**
- 内容支持HTML格式存储
- 难度等级通过AI算法自动评估
- 支持按分类和难度筛选

### 3. Reading_Records (阅读记录实体)
**主要属性：**
- `reading_position`: 阅读位置（字符偏移量）
- `reading_progress`: 阅读进度百分比
- `start_time/end_time`: 阅读开始和结束时间
- `reading_duration`: 总阅读时长（秒）
- `is_completed`: 是否已完成阅读

**业务规则：**
- 每个用户对每篇文章只有一条记录
- 自动计算阅读进度和时长
- 支持断点续读功能

### 4. Reading_Sessions (阅读会话实体)
**主要属性：**
- `session_start/session_end`: 会话开始和结束时间
- `start_position/end_position`: 会话中的阅读位置
- `active_duration`: 有效阅读时长

**业务规则：**
- 记录每次阅读会话的详细信息
- 用于精确的阅读行为分析
- 支持多设备同步

### 5. Vocabulary (单词库实体)
**主要属性：**
- `word`: 单词原文
- `phonetic`: 音标
- `definition`: 释义
- `example_sentence`: 例句
- `difficulty_level`: 词汇难度

**业务规则：**
- 单词唯一约束
- 支持多语言释义
- 集成第三方词典API

### 6. User_Vocabulary (用户单词收藏实体)
**主要属性：**
- `context`: 单词在文章中的上下文
- `mastery_level`: 掌握程度（学习中、熟悉、掌握）
- `review_count`: 复习次数
- `last_reviewed_at`: 最后复习时间

**业务规则：**
- 记录单词来源文章
- 支持学习进度跟踪
- 智能复习提醒

## 关系约束说明

### 主要外键关系
1. **Reading_Records.user_id → Users.id** (CASCADE DELETE)
2. **Reading_Records.article_id → Articles.id** (CASCADE DELETE)
3. **Reading_Sessions.user_id → Users.id** (CASCADE DELETE)
4. **Reading_Sessions.article_id → Articles.id** (CASCADE DELETE)
5. **User_Vocabulary.user_id → Users.id** (CASCADE DELETE)
6. **User_Vocabulary.vocabulary_id → Vocabulary.id** (CASCADE DELETE)
7. **User_Vocabulary.article_id → Articles.id** (SET NULL)

### 索引优化策略
```sql
-- 用户相关查询优化
CREATE INDEX idx_user_reading_history ON reading_records(user_id, start_time DESC);
CREATE INDEX idx_user_vocabulary_mastery ON user_vocabulary(user_id, mastery_level);

-- 文章相关查询优化
CREATE INDEX idx_article_category_difficulty ON articles(category, difficulty_level);
CREATE INDEX idx_article_published ON articles(published_at DESC);

-- 阅读会话查询优化
CREATE INDEX idx_session_user_time ON reading_sessions(user_id, session_start DESC);

-- 单词查询优化
CREATE INDEX idx_vocabulary_word ON vocabulary(word);
CREATE INDEX idx_vocabulary_difficulty ON vocabulary(difficulty_level);
```

## 数据完整性保证

### 1. 实体完整性
- 所有主键非空且唯一
- 使用AUTO_INCREMENT确保主键唯一性

### 2. 参照完整性
- 外键约束确保数据一致性
- 设置适当的删除策略（CASCADE/SET NULL）

### 3. 域完整性
- 使用ENUM类型限制取值范围
- 设置合理的字段长度限制
- 非空约束确保必要字段有值

### 4. 用户定义完整性
```sql
-- 阅读进度必须在0-100之间
ALTER TABLE reading_records ADD CONSTRAINT check_progress 
CHECK (reading_progress >= 0 AND reading_progress <= 100);

-- 阅读时长必须为非负数
ALTER TABLE reading_records ADD CONSTRAINT check_duration 
CHECK (reading_duration >= 0);

-- 单词长度限制
ALTER TABLE vocabulary ADD CONSTRAINT check_word_length 
CHECK (CHAR_LENGTH(word) > 0 AND CHAR_LENGTH(word) <= 100);
```

## 扩展设计考虑

### 1. 分表策略
- **Reading_Records**: 按年份分表，提高查询性能
- **Reading_Sessions**: 按月份分表，便于数据归档

### 2. 缓存设计
- 用户常读文章列表
- 热门单词释义
- 用户阅读统计数据

### 3. 数据同步
- 支持多设备数据同步
- 离线数据本地存储
- 增量同步机制

这个ER图设计充分考虑了英语阅读应用的业务需求，支持阅读进度跟踪、单词学习管理、用户行为分析等核心功能，同时具备良好的扩展性和性能优化空间。 