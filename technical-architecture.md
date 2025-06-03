# 英语阅读应用 - 技术架构设计

## 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (Client Layer)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  📱 移动端H5应用      💻 Web管理后台        📊 数据分析面板                    │
│  Vue.js + Vant UI    Vue.js + Element UI   Vue.js + ECharts                 │
│  PWA支持             后台管理功能           实时数据可视化                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                               HTTPS + CDN
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              网关层 (Gateway Layer)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  🚪 API网关 (Nginx + Kong)                                                  │
│  - 路由转发           - 限流熔断        - 安全认证                             │
│  - 负载均衡           - 日志监控        - CORS处理                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              应用层 (Application Layer)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔧 微服务架构 (Node.js + Express)                                          │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   用户服务       │  │   内容服务       │  │   学习服务       │             │
│  │ User Service    │  │Content Service  │  │Learning Service │             │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤             │
│  │• 用户认证授权    │  │• 文章管理       │  │• 阅读进度跟踪    │             │
│  │• 个人信息管理    │  │• 内容爬取       │  │• 单词库管理      │             │
│  │• 会话管理       │  │• 分类标签       │  │• 学习统计分析    │             │
│  └─────────────────┘  │• 搜索推荐       │  │• 智能复习提醒    │             │
│                       └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   字典服务       │  │   通知服务       │  │   文件服务       │             │
│  │Dictionary Svc   │  │Notification Svc │  │  File Service   │             │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤             │
│  │• 多源字典集成    │  │• 消息推送       │  │• 图片上传       │             │
│  │• 智能缓存       │  │• 邮件通知       │  │• 文件存储       │             │
│  │• 词义合并       │  │• 学习提醒       │  │• CDN分发        │             │
│  │• 降级容错       │  │• 复习提醒       │  │• 音频播放       │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│           │                                                                 │
│           v                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┤
│  │                    外部字典API集成 (External APIs)                       │
│  ├─────────────────────────────────────────────────────────────────────────┤
│  │ 📚 Oxford API    📖 Cambridge API   📗 Merriam-Webster   🔍 有道词典     │
│  │ 📘 朗文词典      📙 柯林斯词典      📕 Free Dictionary   🌐 WordsAPI     │
│  └─────────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据层 (Data Layer)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  💾 主数据库                📊 缓存层               🗄️ 文件存储                │
│  MySQL 8.0 集群            Redis Cluster          阿里云OSS/AWS S3           │
│  - 读写分离                - 字典缓存              - 静态资源                  │
│  - 分库分表                - 热点数据              - 音频文件                  │
│  - 主从复制                - 会话缓存              - 备份归档                  │
│                                                                             │
│  📈 时序数据库              🔍 搜索引擎             📝 消息队列                │
│  InfluxDB                  Elasticsearch           Redis + Bull Queue         │
│  - 用户行为埋点            - 全文搜索              - 异步任务                  │
│  - 字典查询统计            - 智能推荐              - 邮件发送                  │
│  - 性能监控数据            - 日志分析              - 字典预加载                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 技术栈选型

### 前端技术栈

#### 移动端H5应用
```javascript
{
  "框架": "Vue.js 3.x",
  "UI组件库": "Vant UI 4.x",
  "状态管理": "Pinia",
  "路由": "Vue Router 4.x",
  "构建工具": "Vite",
  "类型检查": "TypeScript",
  "PWA": "Workbox",
  "测试": "Vitest + Vue Test Utils",
  "音频播放": "Howler.js"
}
```

**核心特性：**
- 响应式设计，适配各种移动设备
- PWA支持，离线阅读功能
- 虚拟滚动，优化长文章阅读性能
- 手势操作支持（点击查词、滑动翻页）
- 音标音频播放支持

#### 管理后台
```javascript
{
  "框架": "Vue.js 3.x",
  "UI组件库": "Element Plus",
  "图表库": "ECharts",
  "富文本编辑": "TinyMCE",
  "表格组件": "vxe-table"
}
```

### 后端技术栈

#### 主要技术
```javascript
{
  "运行时": "Node.js 18.x LTS",
  "框架": "Express.js",
  "语言": "TypeScript",
  "ORM": "Prisma",
  "认证": "JWT + Passport.js",
  "API文档": "Swagger/OpenAPI",
  "测试": "Jest + Supertest",
  "HTTP客户端": "Axios",
  "限流": "express-rate-limit"
}
```

#### 微服务架构
```yaml
services:
  user-service:
    description: "用户管理服务"
    port: 3001
    functions:
      - 用户注册登录
      - 个人信息管理
      - 权限控制
      
  content-service:
    description: "内容管理服务"
    port: 3002
    functions:
      - 文章爬取和解析
      - 内容分类管理
      - 搜索和推荐
      
  learning-service:
    description: "学习功能服务"
    port: 3003
    functions:
      - 阅读进度跟踪
      - 单词库管理
      - 学习数据分析
      
  dictionary-service:
    description: "字典服务"
    port: 3004
    functions:
      - 多源字典API集成
      - 智能缓存管理
      - 词义数据合并
      - 服务降级容错
      
  notification-service:
    description: "通知服务"
    port: 3005
    functions:
      - 消息推送
      - 邮件通知
      - 学习提醒
```

### 数据库设计

#### 主数据库 - MySQL 8.0
```sql
-- 分库分表策略
CREATE DATABASE enreading_user;       -- 用户相关数据
CREATE DATABASE enreading_content;    -- 内容相关数据  
CREATE DATABASE enreading_learn;      -- 学习相关数据
CREATE DATABASE enreading_dictionary; -- 字典缓存数据

-- 分表策略
-- reading_records 按年份分表
CREATE TABLE reading_records_2024 LIKE reading_records;
CREATE TABLE reading_records_2025 LIKE reading_records;

-- dictionary_cache 按单词首字母分表
CREATE TABLE dictionary_cache_a LIKE dictionary_cache;
CREATE TABLE dictionary_cache_b LIKE dictionary_cache;
-- ... 其他字母
```

#### 缓存层 - Redis
```javascript
// 缓存策略设计
const cacheConfig = {
  // 用户会话 (30分钟)
  userSession: {
    key: 'session:${userId}',
    ttl: 1800
  },
  
  // 字典查询结果 (24小时)  
  dictionaryResult: {
    key: 'dict:${word}',
    ttl: 86400
  },
  
  // 热门单词 (7天)
  popularWords: {
    key: 'popular:${word}',
    ttl: 604800
  },
  
  // 用户阅读进度 (实时)
  readingProgress: {
    key: 'progress:${userId}:${articleId}',
    ttl: -1
  },
  
  // 字典API状态 (5分钟)
  dictionaryApiStatus: {
    key: 'api:status:${apiName}',
    ttl: 300
  }
};
```

## 核心功能实现方案

### 1. 字典服务架构

#### 字典服务核心类
```javascript
// 字典服务主控制器
class DictionaryController {
  constructor() {
    this.dictionaryService = new DictionaryService();
    this.cacheManager = new DictionaryCacheManager();
    this.fallbackService = new DictionaryFallbackService();
  }

  async getWordDefinition(req, res) {
    try {
      const { word } = req.params;
      const { format = 'mobile', useCache = true } = req.query;
      
      // 参数验证
      if (!this.isValidWord(word)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid word format'
        });
      }

      // 获取释义
      const definition = await this.dictionaryService.getWordDefinition(word, {
        format,
        useCache: useCache === 'true'
      });

      res.json({
        success: true,
        data: definition,
        cached: definition._cached || false
      });
    } catch (error) {
      console.error('Dictionary lookup failed:', error);
      
      // 降级处理
      const fallback = await this.fallbackService.getFallbackDefinition(req.params.word);
      
      res.status(200).json({
        success: true,
        data: fallback,
        fallback: true,
        error: error.message
      });
    }
  }

  async batchGetDefinitions(req, res) {
    try {
      const { words } = req.body;
      
      if (!Array.isArray(words) || words.length > 20) {
        return res.status(400).json({
          success: false,
          error: 'Invalid words array (max 20 words)'
        });
      }

      const results = await Promise.allSettled(
        words.map(word => this.dictionaryService.getWordDefinition(word))
      );

      const definitions = results.map((result, index) => ({
        word: words[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason.message : null
      }));

      res.json({
        success: true,
        data: definitions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
```

#### 多源字典集成
```javascript
class DictionaryService {
  constructor() {
    this.dictionaries = new Map([
      ['oxford', new OxfordDictionary()],
      ['cambridge', new CambridgeDictionary()],
      ['merriam-webster', new MerriamWebsterDictionary()],
      ['youdao', new YoudaoDictionary()],
      ['freedict', new FreeDictionary()]
    ]);
    
    this.cache = new DictionaryCache();
    this.healthMonitor = new DictionaryHealthMonitor();
    this.rateLimiter = new DictionaryRateLimiter();
  }

  async getWordDefinition(word, options = {}) {
    const normalizedWord = this.normalizeWord(word);
    
    // 1. 检查缓存
    if (options.useCache) {
      const cached = await this.cache.get(normalizedWord);
      if (cached) {
        return { ...cached, _cached: true };
      }
    }

    // 2. 获取可用的字典源
    const availableDictionaries = await this.getAvailableDictionaries();
    
    // 3. 并行查询多个字典源
    const results = await this.queryDictionaries(normalizedWord, availableDictionaries);
    
    // 4. 合并结果
    const merged = this.mergeResults(results);
    
    // 5. 缓存结果
    await this.cache.set(normalizedWord, merged);
    
    return merged;
  }

  async getAvailableDictionaries() {
    const available = [];
    
    for (const [name, dictionary] of this.dictionaries) {
      const isHealthy = await this.healthMonitor.isHealthy(name);
      const hasQuota = await this.rateLimiter.hasQuota(name);
      
      if (isHealthy && hasQuota) {
        available.push({
          name,
          dictionary,
          priority: dictionary.priority
        });
      }
    }
    
    return available.sort((a, b) => a.priority - b.priority);
  }

  async queryDictionaries(word, dictionaries) {
    const promises = dictionaries.map(async ({ name, dictionary }) => {
      try {
        // 应用速率限制
        await this.rateLimiter.acquire(name);
        
        const startTime = Date.now();
        const result = await dictionary.lookup(word);
        const responseTime = Date.now() - startTime;
        
        // 记录成功指标
        await this.healthMonitor.recordSuccess(name, responseTime);
        
        return {
          source: name,
          priority: dictionary.priority,
          data: result,
          success: true,
          responseTime
        };
      } catch (error) {
        // 记录失败指标
        await this.healthMonitor.recordFailure(name, error);
        
        return {
          source: name,
          priority: dictionary.priority,
          error: error.message,
          success: false
        };
      }
    });

    const results = await Promise.allSettled(promises);
    
    return results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value);
  }

  mergeResults(results) {
    if (results.length === 0) {
      throw new Error('No dictionary sources available');
    }

    const primary = results[0];
    
    return {
      word: primary.data.word,
      phonetic: this.mergePronunciations(results),
      definitions: this.mergeDefinitions(results),
      examples: this.mergeExamples(results),
      audio: this.mergeAudioUrls(results),
      etymology: primary.data.etymology || null,
      frequency: this.calculateFrequency(primary.data),
      difficulty: this.assessDifficulty(primary.data),
      sources: results.map(r => r.source),
      quality: this.calculateQuality(results),
      timestamp: new Date().toISOString()
    };
  }
}
```

### 2. 智能缓存管理

#### 缓存管理器
```javascript
class DictionaryCacheManager {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.db = new PrismaClient();
    this.localCache = new Map(); // 内存缓存
  }

  async get(word) {
    // 1. 内存缓存 (最快)
    if (this.localCache.has(word)) {
      const cached = this.localCache.get(word);
      if (Date.now() - cached.timestamp < 300000) { // 5分钟
        return cached.data;
      }
      this.localCache.delete(word);
    }

    // 2. Redis缓存 (快)
    const redisKey = `dict:${word}`;
    const redisCached = await this.redis.get(redisKey);
    if (redisCached) {
      const data = JSON.parse(redisCached);
      
      // 更新内存缓存
      this.localCache.set(word, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    }

    // 3. 数据库缓存 (慢但持久)
    const dbCached = await this.db.dictionaryCache.findUnique({
      where: { word: word.toLowerCase() }
    });
    
    if (dbCached) {
      // 更新Redis和内存缓存
      await this.redis.setex(redisKey, 86400, JSON.stringify(dbCached.data));
      this.localCache.set(word, {
        data: dbCached.data,
        timestamp: Date.now()
      });
      
      return dbCached.data;
    }

    return null;
  }

  async set(word, data) {
    const redisKey = `dict:${word}`;
    
    // 1. 更新内存缓存
    this.localCache.set(word, {
      data,
      timestamp: Date.now()
    });
    
    // 2. 更新Redis缓存
    await this.redis.setex(redisKey, 86400, JSON.stringify(data));
    
    // 3. 更新数据库缓存
    await this.db.dictionaryCache.upsert({
      where: { word: word.toLowerCase() },
      update: {
        data,
        sources: data.sources,
        quality_score: data.quality,
        last_updated: new Date(),
        access_count: { increment: 1 }
      },
      create: {
        word: word.toLowerCase(),
        data,
        sources: data.sources,
        quality_score: data.quality,
        access_count: 1
      }
    });
  }

  // 清理过期缓存
  async cleanup() {
    // 清理内存缓存
    const now = Date.now();
    for (const [word, cached] of this.localCache) {
      if (now - cached.timestamp > 300000) { // 5分钟过期
        this.localCache.delete(word);
      }
    }

    // 清理低质量的数据库缓存
    await this.db.dictionaryCache.deleteMany({
      where: {
        AND: [
          { quality_score: { lt: 0.5 } },
          { access_count: { lt: 5 } },
          { last_updated: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        ]
      }
    });
  }
}
```

### 3. 前端单词查询优化

#### 前端单词点击处理
```javascript
class WordClickHandler {
  constructor(container) {
    this.container = container;
    this.dictionaryAPI = new DictionaryAPI();
    this.audioPlayer = new AudioPlayer();
    this.setupWordClickListener();
    this.preloadQueue = new Set();
  }

  setupWordClickListener() {
    this.container.addEventListener('click', async (event) => {
      const target = event.target;
      
      // 检查是否点击了单词
      if (this.isClickableWord(target)) {
        event.preventDefault();
        
        const word = this.extractWord(target);
        const rect = target.getBoundingClientRect();
        
        // 显示加载状态
        this.showLoadingPopup(word, rect);
        
        try {
          // 获取释义
          const definition = await this.dictionaryAPI.getDefinition(word);
          
          // 显示释义弹窗
          this.showDefinitionPopup(word, definition, rect);
          
          // 预加载相关单词
          this.preloadRelatedWords(definition);
          
        } catch (error) {
          this.showErrorPopup(word, error.message, rect);
        }
      }
    });
  }

  async getDefinition(word) {
    // 先检查本地缓存
    const cached = this.getFromLocalCache(word);
    if (cached) {
      return cached;
    }

    // 从API获取
    const response = await fetch(`/api/dictionary/define/${encodeURIComponent(word)}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Dictionary lookup failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error occurred');
    }

    // 缓存结果
    this.setLocalCache(word, result.data);
    
    return result.data;
  }

  showDefinitionPopup(word, definition, rect) {
    // 移除现有弹窗
    this.removeExistingPopups();
    
    const popup = document.createElement('div');
    popup.className = 'word-definition-popup';
    popup.innerHTML = this.renderDefinitionHTML(word, definition);
    
    // 计算弹窗位置
    const position = this.calculatePopupPosition(rect);
    popup.style.left = `${position.x}px`;
    popup.style.top = `${position.y}px`;
    
    document.body.appendChild(popup);
    
    // 绑定事件
    this.bindPopupEvents(popup, word, definition);
    
    // 添加动画
    requestAnimationFrame(() => {
      popup.classList.add('show');
    });
  }

  renderDefinitionHTML(word, definition) {
    return `
      <div class="word-popup-header">
        <h3 class="word-title">${word}</h3>
        ${definition.phonetic ? `
          <div class="pronunciation">
            <span class="phonetic">${definition.phonetic}</span>
            ${definition.audio ? `
              <button class="audio-btn" data-audio="${definition.audio}">🔊</button>
            ` : ''}
          </div>
        ` : ''}
        <button class="close-btn">✕</button>
      </div>
      
      <div class="definitions">
        ${definition.definitions.map((def, index) => `
          <div class="definition-item">
            <span class="part-of-speech">${def.partOfSpeech}</span>
            <p class="meaning">${def.meaning}</p>
          </div>
        `).join('')}
      </div>
      
      ${definition.examples && definition.examples.length > 0 ? `
        <div class="examples">
          <h4>例句:</h4>
          ${definition.examples.slice(0, 2).map(example => `
            <p class="example">"${example}"</p>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="actions">
        <button class="add-to-vocabulary-btn" data-word="${word}">
          📚 加入单词库
        </button>
        <button class="share-btn" data-word="${word}">
          📤 分享
        </button>
      </div>
    `;
  }

  bindPopupEvents(popup, word, definition) {
    // 关闭按钮
    popup.querySelector('.close-btn').addEventListener('click', () => {
      this.removePopup(popup);
    });

    // 音频播放
    const audioBtn = popup.querySelector('.audio-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const audioUrl = audioBtn.dataset.audio;
        this.audioPlayer.play(audioUrl);
      });
    }

    // 添加到单词库
    popup.querySelector('.add-to-vocabulary-btn').addEventListener('click', async () => {
      try {
        await this.addToVocabulary(word, definition);
        this.showSuccessToast('已添加到单词库');
      } catch (error) {
        this.showErrorToast('添加失败: ' + error.message);
      }
    });

    // 点击外部关闭
    document.addEventListener('click', (event) => {
      if (!popup.contains(event.target)) {
        this.removePopup(popup);
      }
    }, { once: true });
  }
}
```

这个调整后的技术架构充分体现了外部字典API的集成策略，通过智能缓存、健康监控、降级容错等机制，确保字典服务的高可用性和优秀用户体验。 