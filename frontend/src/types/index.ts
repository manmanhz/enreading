export interface User {
  id: number
  username: string
  email: string
  avatar_url?: string
  created_at: string
  last_login_at?: string
}

export interface UserStats {
  total_articles: number
  completed_articles: number
  total_reading_time: number
  average_progress: number
  reading_streak: number
  last_reading_date?: string
}

export interface Article {
  id: number
  title: string
  content: string
  summary: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_time: number
  source_url?: string
  source_name?: string
  image_url?: string
  tags?: string[]
  reading_progress?: number
  is_started?: boolean
  created_at: string
  updated_at: string
}

export interface ArticleList {
  articles: Article[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface VocabularyWord {
  id: number
  word: string
  definition: string
  pronunciation?: string
  part_of_speech?: string
  example_sentence?: string
  source_article_id?: number
  source_context?: string
  mastery_level: 'learning' | 'familiar' | 'mastered'
  review_count: number
  last_reviewed_at?: string
  created_at: string
  updated_at: string
  source_article_title?: string
}

export interface VocabularyList {
  words: VocabularyWord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface VocabularyStats {
  total_words: number
  learning_count: number
  familiar_count: number
  mastered_count: number
  avg_review_count: number
}

export interface ReadingRecord {
  id: number
  user_id: number
  article_id: number
  reading_progress: number
  reading_position: number
  reading_duration: number
  is_completed: boolean
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
  title?: string
  category?: string
  difficulty?: string
  estimated_time?: number
  image_url?: string
}

export interface DictionaryDefinition {
  word: string
  phonetic?: string
  definitions: {
    partOfSpeech: string
    definition: string
    language?: string
    source?: string
  }[]
  examples: string[]
  audio?: string
  sources: string[]
  quality: number
  timestamp: string
  collins?: number
  oxford?: boolean
  bnc?: number
  frq?: number
  exchanges?: {
    type: string
    form: string
  }[]
  tags?: string[]
  isFuzzyMatch?: boolean
  _cached?: boolean
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: User
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data: T
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface UpdateProgressRequest {
  reading_progress: number
  reading_position?: number
  reading_duration?: number
  is_completed?: boolean
}