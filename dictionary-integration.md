# 英语字典集成设计方案

## 外部字典API集成架构

### 多字典源策略

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           字典服务架构 (Dictionary Service)                    │
└─────────────────────────────────────────────────────────────────────────────┘

    用户点击单词 → 字典服务 → 缓存检查 → 外部API调用 → 数据处理 → 返回结果
                     ↓
              ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
              │  一级缓存    │      │  二级缓存    │      │  外部API     │
              │ (Redis)     │ →    │ (MySQL)    │ →    │ 字典源       │
              │ 30分钟      │      │ 永久存储    │      │ 实时查询     │
              └─────────────┘      └─────────────┘      └─────────────┘
                                                              ↓
                                                    ┌─────────────────┐
                                                    │   主要字典源     │
                                                    ├─────────────────┤
                                                    │ • 牛津词典API    │
                                                    │ • 朗文词典API    │
                                                    │ • 韦氏词典API    │
                                                    │ • Cambridge API │
                                                    └─────────────────┘
                                                              ↓
                                                    ┌─────────────────┐
                                                    │   备用字典源     │
                                                    ├─────────────────┤
                                                    │ • 有道词典API    │
                                                    │ • 金山词霸API    │
                                                    │ • FreeDictAPI   │
                                                    │ • WordsAPI      │
                                                    └─────────────────┘
```

## 字典API选型和配置

### 主要字典源

#### 1. Oxford Dictionaries API
```javascript
const oxfordConfig = {
  name: 'oxford',
  priority: 1,
  baseURL: 'https://od-api.oxforddictionaries.com/api/v2',
  headers: {
    'app_id': process.env.OXFORD_APP_ID,
    'app_key': process.env.OXFORD_APP_KEY
  },
  endpoints: {
    entries: '/entries/{source_lang}/{word_id}',
    lemmas: '/lemmas/{source_lang}/{word_id}',
    translations: '/translations/{source_lang_translate}/{target_lang_translate}/{word_id}'
  },
  features: {
    pronunciation: true,
    etymology: true,
    examples: true,
    audioFiles: true,
    definitions: 'comprehensive',
    reliability: 'high'
  },
  pricing: {
    freeRequests: 1000,
    paidPlan: '$0.004 per request'
  }
};
```

#### 2. Cambridge Dictionary API
```javascript
const cambridgeConfig = {
  name: 'cambridge',
  priority: 2,
  baseURL: 'https://dictionary.cambridge.org/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.CAMBRIDGE_API_KEY}`
  },
  endpoints: {
    search: '/dictionaries/{dictionary}/search',
    entry: '/dictionaries/{dictionary}/entries/{entryId}'
  },
  features: {
    pronunciation: true,
    britishAmerican: true,
    learnerDefinitions: true,
    audioFiles: true,
    reliability: 'high'
  }
};
```

#### 3. Merriam-Webster API
```javascript
const merriamWebsterConfig = {
  name: 'merriam-webster',
  priority: 3,
  baseURL: 'https://www.dictionaryapi.com/api/v3',
  headers: {
    'key': process.env.MERRIAM_WEBSTER_API_KEY
  },
  endpoints: {
    collegiate: '/references/collegiate/json/{word}',
    learner: '/references/learners/json/{word}'
  },
  features: {
    pronunciation: true,
    etymology: true,
    examples: true,
    audioFiles: true,
    reliability: 'high'
  },
  pricing: {
    freeRequests: 1000,
    unlimited: '$0.002 per request'
  }
};
```

### 备用字典源

#### 4. 有道词典API
```javascript
const youdaoConfig = {
  name: 'youdao',
  priority: 4,
  baseURL: 'https://openapi.youdao.com/api',
  features: {
    chineseTranslation: true,
    pronunciation: true,
    examples: true,
    reliability: 'medium',
    speed: 'fast'
  },
  pricing: {
    freeRequests: 1000,
    paidPlan: '¥0.01 per request'
  }
};
```

#### 5. Free Dictionary API
```javascript
const freeDictConfig = {
  name: 'freedict',
  priority: 5,
  baseURL: 'https://api.dictionaryapi.dev/api/v2/entries/en',
  features: {
    pronunciation: true,
    examples: true,
    free: true,
    reliability: 'medium'
  },
  limitations: {
    rateLimiting: true,
    basicDefinitions: true
  }
};
```

## 字典服务实现

### 核心字典服务类
```javascript
class DictionaryService {
  constructor() {
    this.dictionaries = [
      new OxfordDictionary(oxfordConfig),
      new CambridgeDictionary(cambridgeConfig),
      new MerriamWebsterDictionary(merriamWebsterConfig),
      new YoudaoDictionary(youdaoConfig),
      new FreeDictionary(freeDictConfig)
    ];
    this.cache = new DictionaryCache();
  }

  async getWordDefinition(word, options = {}) {
    const normalizedWord = this.normalizeWord(word);
    
    // 1. 检查缓存
    const cached = await this.cache.get(normalizedWord);
    if (cached && !options.forceRefresh) {
      return this.formatResponse(cached);
    }

    // 2. 并行查询多个字典源
    const results = await this.queryMultipleSources(normalizedWord);
    
    // 3. 合并和优化结果
    const merged = this.mergeDefinitions(results);
    
    // 4. 缓存结果
    await this.cache.set(normalizedWord, merged);
    
    return this.formatResponse(merged);
  }

  async queryMultipleSources(word) {
    const promises = this.dictionaries.map(async (dict) => {
      try {
        const result = await dict.lookup(word);
        return {
          source: dict.name,
          priority: dict.priority,
          data: result,
          success: true
        };
      } catch (error) {
        console.warn(`Dictionary ${dict.name} failed:`, error.message);
        return {
          source: dict.name,
          priority: dict.priority,
          error: error.message,
          success: false
        };
      }
    });

    const results = await Promise.allSettled(promises);
    return results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value)
      .sort((a, b) => a.priority - b.priority);
  }

  mergeDefinitions(results) {
    if (results.length === 0) {
      throw new Error('No dictionary sources available');
    }

    const primary = results[0]; // 最高优先级的结果
    const secondary = results.slice(1);

    return {
      word: primary.data.word,
      phonetic: this.selectBestPhonetic(results),
      definitions: this.mergeDefinitionLists(results),
      examples: this.selectBestExamples(results),
      audioUrls: this.collectAudioUrls(results),
      etymology: primary.data.etymology || null,
      sources: results.map(r => r.source),
      timestamp: new Date().toISOString()
    };
  }

  selectBestPhonetic(results) {
    // 优先选择英式发音，然后美式发音
    for (const result of results) {
      if (result.data.phonetic) {
        const phonetic = result.data.phonetic;
        if (phonetic.uk) return phonetic.uk;
        if (phonetic.us) return phonetic.us;
        if (typeof phonetic === 'string') return phonetic;
      }
    }
    return null;
  }

  mergeDefinitionLists(results) {
    const allDefinitions = [];
    const seen = new Set();

    for (const result of results) {
      if (result.data.definitions) {
        for (const def of result.data.definitions) {
          const key = `${def.partOfSpeech}-${def.meaning}`;
          if (!seen.has(key)) {
            seen.add(key);
            allDefinitions.push({
              ...def,
              source: result.source
            });
          }
        }
      }
    }

    return allDefinitions.slice(0, 5); // 限制定义数量
  }

  selectBestExamples(results) {
    const examples = [];
    for (const result of results) {
      if (result.data.examples) {
        examples.push(...result.data.examples);
      }
    }
    return examples.slice(0, 3); // 限制例句数量
  }

  collectAudioUrls(results) {
    const audioUrls = {};
    for (const result of results) {
      if (result.data.audio) {
        audioUrls[result.source] = result.data.audio;
      }
    }
    return audioUrls;
  }
}
```

### 字典缓存策略
```javascript
class DictionaryCache {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.db = new PrismaClient();
  }

  async get(word) {
    // 1. 先检查Redis缓存 (30分钟)
    const redisKey = `dict:${word}`;
    const cached = await this.redis.get(redisKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. 检查数据库缓存 (永久)
    const dbRecord = await this.db.dictionaryCache.findUnique({
      where: { word: word.toLowerCase() }
    });
    
    if (dbRecord) {
      // 更新Redis缓存
      await this.redis.setex(redisKey, 1800, JSON.stringify(dbRecord.data));
      return dbRecord.data;
    }

    return null;
  }

  async set(word, data) {
    const redisKey = `dict:${word}`;
    
    // 1. 存入Redis (30分钟)
    await this.redis.setex(redisKey, 1800, JSON.stringify(data));
    
    // 2. 存入数据库 (永久)
    await this.db.dictionaryCache.upsert({
      where: { word: word.toLowerCase() },
      update: {
        data: data,
        lastUpdated: new Date(),
        accessCount: { increment: 1 }
      },
      create: {
        word: word.toLowerCase(),
        data: data,
        lastUpdated: new Date(),
        accessCount: 1
      }
    });
  }
}
```

## 数据库表结构调整

### 字典缓存表
```sql
-- 替换原来的vocabulary表
CREATE TABLE dictionary_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    word VARCHAR(100) NOT NULL,
    data JSON NOT NULL, -- 存储完整的字典数据
    sources JSON, -- 数据来源记录
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    access_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_word (word),
    INDEX idx_word (word),
    INDEX idx_last_updated (last_updated),
    INDEX idx_access_count (access_count)
);
```

### 用户单词收藏表调整
```sql
-- 调整用户单词收藏表
CREATE TABLE user_vocabulary (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    word VARCHAR(100) NOT NULL, -- 直接存储单词，不再关联vocabulary表
    article_id INT, -- 从哪篇文章添加的
    context TEXT, -- 单词在文章中的上下文
    definition_snapshot JSON, -- 添加时的释义快照
    mastery_level ENUM('learning', 'familiar', 'mastered') DEFAULT 'learning',
    review_count INT DEFAULT 0,
    last_reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_word (user_id, word),
    INDEX idx_user_mastery (user_id, mastery_level),
    INDEX idx_review_time (last_reviewed_at),
    INDEX idx_word (word)
);
```

## API端点设计

### 字典查询API
```javascript
// GET /api/dictionary/define/:word
app.get('/api/dictionary/define/:word', async (req, res) => {
  try {
    const { word } = req.params;
    const { format = 'mobile', refresh = false } = req.query;
    
    const definition = await dictionaryService.getWordDefinition(word, {
      format,
      forceRefresh: refresh === 'true'
    });
    
    res.json({
      success: true,
      data: definition,
      cached: !refresh
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: await this.getFallbackDefinition(req.params.word)
    });
  }
});

// POST /api/dictionary/batch
app.post('/api/dictionary/batch', async (req, res) => {
  try {
    const { words } = req.body;
    const results = await Promise.all(
      words.map(word => dictionaryService.getWordDefinition(word))
    );
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## 错误处理和降级策略

### 服务降级机制
```javascript
class DictionaryFallback {
  constructor() {
    this.localDict = new LocalDictionary(); // 离线词典
    this.simpleTranslate = new SimpleTranslate(); // 简单翻译服务
  }

  async getFallbackDefinition(word) {
    try {
      // 1. 尝试本地离线词典
      const local = await this.localDict.lookup(word);
      if (local) return this.formatLocalResult(local);
      
      // 2. 尝试简单翻译
      const translated = await this.simpleTranslate.translate(word);
      if (translated) return this.formatTranslationResult(translated);
      
      // 3. 返回基础信息
      return this.getBasicWordInfo(word);
    } catch (error) {
      return this.getMinimalResponse(word);
    }
  }

  getMinimalResponse(word) {
    return {
      word,
      phonetic: null,
      definitions: [{
        partOfSpeech: 'unknown',
        meaning: '暂时无法获取释义，请稍后重试',
        source: 'fallback'
      }],
      examples: [],
      error: true,
      fallback: true
    };
  }
}
```

## 性能优化策略

### 预加载和批量处理
```javascript
class DictionaryOptimizer {
  constructor(dictionaryService) {
    this.service = dictionaryService;
    this.preloadQueue = new Set();
  }

  // 预加载文章中的生词
  async preloadArticleWords(articleContent) {
    const words = this.extractWords(articleContent);
    const uncommonWords = await this.filterUncommonWords(words);
    
    // 批量预加载
    const batchSize = 10;
    for (let i = 0; i < uncommonWords.length; i += batchSize) {
      const batch = uncommonWords.slice(i, i + batchSize);
      this.queuePreload(batch);
    }
  }

  async queuePreload(words) {
    // 后台异步预加载，不阻塞主流程
    setTimeout(async () => {
      try {
        await Promise.all(
          words.map(word => this.service.getWordDefinition(word))
        );
      } catch (error) {
        console.warn('Preload failed:', error.message);
      }
    }, 100);
  }

  extractWords(content) {
    // 提取英文单词，过滤常用词
    return content
      .match(/\b[a-zA-Z]{3,}\b/g)
      ?.filter(word => !this.isCommonWord(word))
      || [];
  }
}
```

这个重新设计的方案充分利用了外部专业字典API，提供了更准确、更丰富的词汇释义，同时通过多层缓存和降级机制确保了服务的稳定性和性能。 