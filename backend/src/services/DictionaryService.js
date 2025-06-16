const axios = require('axios');
const { pool, redisClient } = require('../config/database');

class DictionaryService {
  constructor() {
    this.dictionaries = new Map([
      ['oxford', {
        name: 'oxford',
        priority: 1,
        baseURL: 'https://od-api.oxforddictionaries.com/api/v2',
        headers: {
          'app_id': process.env.OXFORD_APP_ID,
          'app_key': process.env.OXFORD_APP_KEY
        },
        active: !!process.env.OXFORD_APP_ID
      }],
      ['cambridge', {
        name: 'cambridge',
        priority: 2,
        baseURL: 'https://dictionary.cambridge.org/api/v1',
        headers: {
          'Authorization': `Bearer ${process.env.CAMBRIDGE_API_KEY}`
        },
        active: !!process.env.CAMBRIDGE_API_KEY
      }],
      ['merriam-webster', {
        name: 'merriam-webster',
        priority: 3,
        baseURL: 'https://www.dictionaryapi.com/api/v3',
        active: !!process.env.MERRIAM_WEBSTER_API_KEY
      }],
      ['youdao', {
        name: 'youdao',
        priority: 4,
        baseURL: 'https://openapi.youdao.com/api',
        active: !!process.env.YOUDAO_APP_KEY
      }],
      ['freedict', {
        name: 'freedict',
        priority: 5,
        baseURL: 'https://api.dictionaryapi.dev/api/v2/entries/en',
        active: true // 免费API，始终可用
      }],
      ['stardict', {
        name: 'stardict',
        priority: 0, // 最高优先级，本地数据库
        active: true // 本地ECDICT数据库
      }]
    ]);
  }

  // 获取单词释义（主入口）
  async getWordDefinition(word, options = {}) {
    try {
      const normalizedWord = this.normalizeWord(word);
      
      // 1. 检查缓存
      if (options.useCache !== false) {
        const cached = await this.getCachedDefinition(normalizedWord);
        if (cached) {
          return { ...cached, _cached: true };
        }
      }

      // 2. 并行查询多个字典源
      const results = await this.queryMultipleSources(normalizedWord);
      
      // 3. 合并和优化结果
      const merged = this.mergeDefinitions(results);
      
      // 4. 缓存结果
      await this.cacheDefinition(normalizedWord, merged);
      
      return merged;
    } catch (error) {
      console.error('Dictionary lookup error:', error);
      throw error;
    }
  }

  // 标准化单词
  normalizeWord(word) {
    return word.toLowerCase().trim().replace(/[^\w]/g, '');
  }

  // 从缓存获取释义
  async getCachedDefinition(word) {
    try {
      // 1. 先检查Redis缓存
      const redisKey = `dict:${word}`;
      const cached = await redisClient.get(redisKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 2. 检查数据库缓存
      const [rows] = await pool.execute(
        'SELECT data FROM dictionary_cache WHERE word = ?',
        [word]
      );
      
      if (rows.length > 0) {
        const data = rows[0].data;
        
        // 更新Redis缓存
        await redisClient.setEx(redisKey, 86400, JSON.stringify(data));
        
        // 更新访问计数
        await pool.execute(
          'UPDATE dictionary_cache SET access_count = access_count + 1 WHERE word = ?',
          [word]
        );
        
        return data;
      }

      return null;
    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  // 缓存释义
  async cacheDefinition(word, data) {
    try {
      const redisKey = `dict:${word}`;
      
      // 1. 存入Redis
      await redisClient.setEx(redisKey, 86400, JSON.stringify(data));
      
      // 2. 存入数据库
      await pool.execute(`
        INSERT INTO dictionary_cache (word, data, sources, quality_score, access_count)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
        data = VALUES(data),
        sources = VALUES(sources),
        quality_score = VALUES(quality_score),
        access_count = access_count + 1,
        last_updated = CURRENT_TIMESTAMP
      `, [
        word,
        JSON.stringify(data),
        JSON.stringify(data.sources || []),
        data.quality || 0.8
      ]);
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  // 并行查询多个字典源
  async queryMultipleSources(word) {
    const availableDictionaries = Array.from(this.dictionaries.values())
      .filter(dict => dict.active)
      .sort((a, b) => a.priority - b.priority);

    const promises = availableDictionaries.map(async (dict) => {
      try {
        const startTime = Date.now();
        const result = await this.queryDictionary(dict, word);
        const responseTime = Date.now() - startTime;
        
        return {
          source: dict.name,
          priority: dict.priority,
          data: result,
          success: true,
          responseTime
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
      .slice(0, 3); // 最多使用3个源的结果
  }

  // 查询单个字典源
  async queryDictionary(dict, word) {
    switch (dict.name) {
      case 'stardict':
        return await this.queryStardict(dict, word);
      case 'oxford':
        return await this.queryOxford(dict, word);
      case 'freedict':
        return await this.queryFreeDictionary(dict, word);
      case 'youdao':
        return await this.queryYoudao(dict, word);
      default:
        throw new Error(`Dictionary ${dict.name} not implemented`);
    }
  }

  // 查询牛津词典
  async queryOxford(dict, word) {
    const url = `${dict.baseURL}/entries/en-gb/${word}`;
    const response = await axios.get(url, {
      headers: dict.headers,
      timeout: 5000
    });

    const data = response.data;
    if (!data.results || data.results.length === 0) {
      throw new Error('No results found');
    }

    const entry = data.results[0];
    const lexicalEntry = entry.lexicalEntries[0];
    
    return {
      word: entry.word,
      phonetic: this.extractOxfordPhonetic(lexicalEntry),
      definitions: this.extractOxfordDefinitions(lexicalEntry),
      examples: this.extractOxfordExamples(lexicalEntry),
      audio: this.extractOxfordAudio(lexicalEntry)
    };
  }

  // 查询Free Dictionary API
  async queryFreeDictionary(dict, word) {
    const url = `${dict.baseURL}/${word}`;
    const response = await axios.get(url, { timeout: 5000 });

    const data = response.data[0];
    
    return {
      word: data.word,
      phonetic: data.phonetic || (data.phonetics && data.phonetics[0]?.text),
      definitions: this.extractFreeDictDefinitions(data.meanings),
      examples: this.extractFreeDictExamples(data.meanings),
      audio: data.phonetics && data.phonetics.find(p => p.audio)?.audio
    };
  }

  // 查询有道词典
  async queryYoudao(dict, word) {
    const appKey = process.env.YOUDAO_APP_KEY;
    const appSecret = process.env.YOUDAO_APP_SECRET;
    const salt = Date.now().toString();
    const curtime = Math.round(Date.now() / 1000);
    
    // 生成签名
    const crypto = require('crypto');
    const str = appKey + word + salt + curtime + appSecret;
    const sign = crypto.createHash('sha256').update(str).digest('hex');

    const response = await axios.post(dict.baseURL, {
      q: word,
      from: 'en',
      to: 'zh-CHS',
      appKey,
      salt,
      sign,
      signType: 'v3',
      curtime
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000
    });

    return this.parseYoudaoResponse(response.data);
  }

  // 合并多个字典源的结果
  mergeDefinitions(results) {
    if (results.length === 0) {
      throw new Error('No dictionary sources available');
    }

    const primary = results[0];
    
    return {
      word: primary.data.word,
      phonetic: this.selectBestPhonetic(results),
      definitions: this.mergeDefinitionLists(results),
      examples: this.selectBestExamples(results),
      audio: this.selectBestAudio(results),
      sources: results.map(r => r.source),
      quality: this.calculateQuality(results),
      timestamp: new Date().toISOString()
    };
  }

  selectBestPhonetic(results) {
    for (const result of results) {
      if (result.data.phonetic) {
        return result.data.phonetic;
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
          const key = `${def.partOfSpeech}-${def.definition.substring(0, 50)}`;
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

    return allDefinitions.slice(0, 5);
  }

  selectBestExamples(results) {
    const examples = [];
    for (const result of results) {
      if (result.data.examples) {
        examples.push(...result.data.examples);
      }
    }
    return [...new Set(examples)].slice(0, 3);
  }

  selectBestAudio(results) {
    for (const result of results) {
      if (result.data.audio) {
        return result.data.audio;
      }
    }
    return null;
  }

  calculateQuality(results) {
    const weights = { oxford: 0.4, cambridge: 0.3, 'merriam-webster': 0.2, freedict: 0.1 };
    let totalWeight = 0;
    let weightedScore = 0;

    for (const result of results) {
      const weight = weights[result.source] || 0.05;
      totalWeight += weight;
      weightedScore += weight;
    }

    return totalWeight > 0 ? Math.min(weightedScore / totalWeight, 1) : 0.5;
  }

  // 牛津词典数据提取方法
  extractOxfordPhonetic(lexicalEntry) {
    if (lexicalEntry.pronunciations) {
      return lexicalEntry.pronunciations[0]?.phoneticSpelling;
    }
    return null;
  }

  extractOxfordDefinitions(lexicalEntry) {
    const definitions = [];
    
    if (lexicalEntry.entries) {
      for (const entry of lexicalEntry.entries) {
        if (entry.senses) {
          for (const sense of entry.senses) {
            if (sense.definitions) {
              definitions.push({
                partOfSpeech: lexicalEntry.lexicalCategory?.text || 'unknown',
                definition: sense.definitions[0]
              });
            }
          }
        }
      }
    }
    
    return definitions;
  }

  extractOxfordExamples(lexicalEntry) {
    const examples = [];
    
    if (lexicalEntry.entries) {
      for (const entry of lexicalEntry.entries) {
        if (entry.senses) {
          for (const sense of entry.senses) {
            if (sense.examples) {
              examples.push(...sense.examples.map(ex => ex.text));
            }
          }
        }
      }
    }
    
    return examples;
  }

  extractOxfordAudio(lexicalEntry) {
    if (lexicalEntry.pronunciations) {
      for (const pronunciation of lexicalEntry.pronunciations) {
        if (pronunciation.audioFile) {
          return pronunciation.audioFile;
        }
      }
    }
    return null;
  }

  // Free Dictionary数据提取方法
  extractFreeDictDefinitions(meanings) {
    const definitions = [];
    
    for (const meaning of meanings) {
      for (const definition of meaning.definitions) {
        definitions.push({
          partOfSpeech: meaning.partOfSpeech,
          definition: definition.definition
        });
      }
    }
    
    return definitions;
  }

  extractFreeDictExamples(meanings) {
    const examples = [];
    
    for (const meaning of meanings) {
      for (const definition of meaning.definitions) {
        if (definition.example) {
          examples.push(definition.example);
        }
      }
    }
    
    return examples;
  }

  // 有道词典响应解析
  parseYoudaoResponse(data) {
    return {
      word: data.query,
      phonetic: data.basic?.phonetic,
      definitions: data.basic?.explains?.map(explain => ({
        partOfSpeech: 'unknown',
        definition: explain
      })) || [],
      examples: data.web?.map(item => item.value.join('; ')).slice(0, 3) || [],
      audio: null
    };
  }

  // 查询本地ECDICT数据库
  async queryStardict(dict, word) {
    try {
      // 直接查询stardict表
      const [rows] = await pool.execute(
        'SELECT * FROM stardict WHERE word = ? LIMIT 1',
        [word.toLowerCase()]
      );

      if (rows.length === 0) {
        // 如果精确匹配失败，尝试模糊匹配
        const [fuzzyRows] = await pool.execute(
          'SELECT * FROM stardict WHERE word LIKE ? ORDER BY word LIMIT 5',
          [`${word.toLowerCase()}%`]
        );
        
        if (fuzzyRows.length === 0) {
          throw new Error('Word not found in ECDICT');
        }
        
        // 返回第一个匹配结果
        const result = fuzzyRows[0];
        return this.formatStardictResult(result, true);
      }

      const result = rows[0];
      return this.formatStardictResult(result, false);
    } catch (error) {
      console.error('Stardict query error:', error);
      throw error;
    }
  }

  // 格式化ECDICT查询结果
  formatStardictResult(data, isFuzzy = false) {
    const definitions = [];
    
    // 处理英文释义
    if (data.definition) {
      const englishDefs = data.definition.split('\n').filter(def => def.trim());
      englishDefs.forEach(def => {
        definitions.push({
          partOfSpeech: data.pos || 'unknown',
          definition: def.trim(),
          language: 'en'
        });
      });
    }
    
    // 处理中文翻译
    if (data.translation) {
      const chineseDefs = data.translation.split('\n').filter(def => def.trim());
      chineseDefs.forEach(def => {
        definitions.push({
          partOfSpeech: data.pos || 'unknown',
          definition: def.trim(),
          language: 'zh'
        });
      });
    }

    // 处理词形变化
    const exchanges = [];
    if (data.exchange) {
      const exchangeParts = data.exchange.split('/');
      exchangeParts.forEach(part => {
        const [type, form] = part.split(':');
        if (type && form) {
          const typeMap = {
            'p': '过去式',
            'd': '过去分词', 
            'i': '现在分词',
            '3': '第三人称单数',
            'r': '比较级',
            't': '最高级',
            's': '复数',
            '0': '原型'
          };
          exchanges.push({
            type: typeMap[type] || type,
            form: form
          });
        }
      });
    }

    return {
      word: data.word,
      phonetic: data.phonetic || null,
      definitions: definitions,
      examples: [], // ECDICT暂时没有例句数据
      audio: data.audio || null,
      collins: data.collins || null,
      oxford: data.oxford ? true : false,
      bnc: data.bnc || null,
      frq: data.frq || null,
      exchanges: exchanges,
      tags: data.tag ? data.tag.split(' ').filter(tag => tag.trim()) : [],
      isFuzzyMatch: isFuzzy
    };
  }
}

module.exports = new DictionaryService();