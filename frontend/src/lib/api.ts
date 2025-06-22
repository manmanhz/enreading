import axios, { AxiosInstance, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'
import { 
  ApiResponse, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest,
  Article,
  ArticleList,
  VocabularyWord,
  VocabularyList,
  VocabularyStats,
  ReadingRecord,
  DictionaryDefinition,
  UpdateProgressRequest,
  UserStats
} from '../types'

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage')
    if (token) {
      try {
        const parsed = JSON.parse(token)
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`
        }
      } catch (error) {
        console.error('Token parsing error:', error)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
      toast.error('登录已过期，请重新登录')
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message)
    } else {
      toast.error('网络错误，请稍后重试')
    }
    return Promise.reject(error)
  }
)

// 认证相关API
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  getProfile: async (): Promise<ApiResponse<{ user: any; stats: UserStats }>> => {
    const response = await api.get('/auth/profile')
    return response.data
  },

  updateProfile: async (data: { username?: string; avatar_url?: string }): Promise<ApiResponse> => {
    const response = await api.put('/auth/profile', data)
    return response.data
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<ApiResponse> => {
    const response = await api.post('/auth/change-password', data)
    return response.data
  },
}

// 文章相关API
export const articleApi = {
  getList: async (params: {
    page?: number
    limit?: number
    category?: string
    difficulty?: string
  } = {}): Promise<ApiResponse<ArticleList>> => {
    const response = await api.get('/articles', { params })
    return response.data
  },

  getById: async (id: number): Promise<ApiResponse<Article>> => {
    const response = await api.get(`/articles/${id}`)
    return response.data
  },

  getCategories: async (): Promise<ApiResponse<{ category: string; count: number }[]>> => {
    const response = await api.get('/articles/categories')
    return response.data
  },

  getPopular: async (limit = 10): Promise<ApiResponse<Article[]>> => {
    const response = await api.get('/articles/popular', { params: { limit } })
    return response.data
  },

  search: async (keyword: string, page = 1, limit = 10): Promise<ApiResponse<{ articles: Article[]; keyword: string; page: number; limit: number }>> => {
    const response = await api.get('/articles/search', { 
      params: { q: keyword, page, limit } 
    })
    return response.data
  },

  updateProgress: async (id: number, data: UpdateProgressRequest): Promise<ApiResponse> => {
    const response = await api.post(`/articles/${id}/progress`, data)
    return response.data
  },
}

// 词库相关API
export const vocabularyApi = {
  getWords: async (params: {
    page?: number
    limit?: number
    mastery_level?: string
    search?: string
    sort_by?: string
    sort_order?: string
  } = {}): Promise<ApiResponse<VocabularyList>> => {
    const response = await api.get('/vocabulary', { params })
    return response.data
  },

  getStats: async (): Promise<ApiResponse<VocabularyStats>> => {
    const response = await api.get('/vocabulary/stats')
    return response.data
  },

  getReviewWords: async (limit = 10): Promise<ApiResponse<VocabularyWord[]>> => {
    const response = await api.get('/vocabulary/review', { params: { limit } })
    return response.data
  },

  addWord: async (data: {
    word: string
    source_article_id?: number
    source_context?: string
  }): Promise<ApiResponse<DictionaryDefinition>> => {
    const response = await api.post('/vocabulary', data)
    return response.data
  },

  updateMastery: async (word: string, mastery_level: string): Promise<ApiResponse> => {
    const response = await api.put(`/vocabulary/${word}/mastery`, { mastery_level })
    return response.data
  },

  reviewWord: async (word: string): Promise<ApiResponse> => {
    const response = await api.post(`/vocabulary/${word}/review`)
    return response.data
  },

  deleteWord: async (word: string): Promise<ApiResponse> => {
    const response = await api.delete(`/vocabulary/${word}`)
    return response.data
  },

  getWordDetail: async (word: string): Promise<ApiResponse<VocabularyWord>> => {
    const response = await api.get(`/vocabulary/${word}`)
    return response.data
  },

  getPracticeQuiz: async (mode: 'definition_to_word' | 'chinese_to_word' | 'word_to_chinese', count = 10): Promise<ApiResponse<{
    mode: string
    questions: Array<{
      id: number
      word: string
      question: string
      options: string[]
      correctAnswer: string
      pronunciation?: string
      part_of_speech?: string
    }>
    total: number
  }>> => {
    const response = await api.get('/vocabulary/practice/quiz', { params: { mode, count } })
    return response.data
  },

  submitPracticeResult: async (data: {
    mode: 'definition_to_word' | 'chinese_to_word' | 'word_to_chinese'
    results: Array<{
      word: string
      isCorrect: boolean
      userAnswer: string
      correctAnswer: string
    }>
  }): Promise<ApiResponse<{
    mode: string
    totalQuestions: number
    correctAnswers: number
    accuracy: number
    results: any[]
  }>> => {
    const response = await api.post('/vocabulary/practice/result', data)
    return response.data
  },
}

// 字典相关API
export const dictionaryApi = {
  lookup: async (word: string): Promise<ApiResponse<DictionaryDefinition>> => {
    const response = await api.get(`/dictionary/define/${word}`)
    return response.data
  },

  batchLookup: async (words: string[]): Promise<ApiResponse<DictionaryDefinition[]>> => {
    const response = await api.post('/dictionary/batch', { words })
    return response.data
  },

  getSuggestions: async (prefix: string): Promise<ApiResponse<string[]>> => {
    const response = await api.get('/dictionary/suggestions', { params: { prefix } })
    return response.data
  },
}

// 阅读记录相关API
export const readingApi = {
  getHistory: async (params: {
    page?: number
    limit?: number
    start_date?: string
    end_date?: string
  } = {}): Promise<ApiResponse<ReadingRecord[]>> => {
    const response = await api.get('/reading/history', { params })
    return response.data
  },

  getStats: async (period = 'all'): Promise<ApiResponse<UserStats & { reading_streak: number }>> => {
    const response = await api.get('/reading/stats', { params: { period } })
    return response.data
  },

  getProgress: async (articleId: number): Promise<ApiResponse<ReadingRecord>> => {
    const response = await api.get(`/reading/progress/${articleId}`)
    return response.data
  },

  deleteRecord: async (articleId: number): Promise<ApiResponse> => {
    const response = await api.delete(`/reading/record/${articleId}`)
    return response.data
  },

  getReport: async (year: number, month?: number): Promise<ApiResponse<{
    period: string
    stats: UserStats
    daily_stats: Record<string, any>
    total_records: number
  }>> => {
    const params: any = { year }
    if (month) params.month = month
    const response = await api.get('/reading/report', { params })
    return response.data
  },
}

export default api