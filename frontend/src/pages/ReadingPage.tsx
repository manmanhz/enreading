import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { 
  ArrowLeft, 
  Settings, 
  MoreVertical, 
  Volume2,
  Plus,
  X,
  Bookmark,
  Share2,
  Moon,
  Sun,
  Type,
  Palette
} from 'lucide-react'
import { articleApi, vocabularyApi, dictionaryApi } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import toast from 'react-hot-toast'

interface ReadingSettings {
  fontSize: number
  lineHeight: number
  fontFamily: string
  theme: 'light' | 'dark' | 'sepia'
  autoSave: boolean
  wordClick: boolean
}

interface WordDefinition {
  word: string
  pronunciation?: string
  definitions: Array<{
    part_of_speech: string
    definition: string
    examples: string[]
  }>
  source: string
}

const ReadingPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const contentRef = useRef<HTMLDivElement>(null)
  
  // 状态管理
  const [readingProgress, setReadingProgress] = useState(0)
  const [readingTime, setReadingTime] = useState(0)
  const [startTime] = useState(Date.now())
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [wordDefinition, setWordDefinition] = useState<WordDefinition | null>(null)
  const [showDefinition, setShowDefinition] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ReadingSettings>({
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: 'system',
    theme: 'light',
    autoSave: true,
    wordClick: true
  })

  // 获取文章详情
  const { data: articleData, isLoading } = useQuery(
    ['article', id],
    () => articleApi.getById(Number(id)),
    { enabled: !!id }
  )

  // 更新阅读进度
  const updateProgressMutation = useMutation(
    (data: { reading_progress: number; reading_duration: number; reading_position?: number }) =>
      articleApi.updateProgress(Number(id), data),
    {
      onError: () => {
        if (token) {
          toast.error('保存进度失败')
        }
      }
    }
  )

  // 添加单词到词汇库
  const addWordMutation = useMutation(
    (data: { word: string; source_article_id: number; source_context: string }) =>
      vocabularyApi.addWord(data),
    {
      onSuccess: () => {
        toast.success('单词已添加到词汇库')
        setShowDefinition(false)
      },
      onError: () => {
        toast.error('添加单词失败')
      }
    }
  )

  // 自动保存进度
  useEffect(() => {
    if (settings.autoSave && token) {
      const timer = setInterval(() => {
        const currentTime = Math.floor((Date.now() - startTime) / 1000 / 60)
        setReadingTime(currentTime)
        
        if (readingProgress > 0) {
          updateProgressMutation.mutate({
            reading_progress: readingProgress,
            reading_duration: currentTime
          })
        }
      }, 30000) // 每30秒保存一次

      return () => clearInterval(timer)
    }
  }, [readingProgress, settings.autoSave, token, startTime])

  // 计算阅读进度
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const element = contentRef.current
        const scrollTop = element.scrollTop
        const scrollHeight = element.scrollHeight - element.clientHeight
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0
        setReadingProgress(Math.min(100, Math.max(0, progress)))
      }
    }

    const element = contentRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 处理单词点击
  const handleWordClick = async (word: string, context: string) => {
    if (!settings.wordClick) return

    setSelectedWord(word)
    setShowDefinition(true)

    try {
      const response = await dictionaryApi.lookup(word.toLowerCase())
      if (response.data) {
        setWordDefinition(response.data)
      }
    } catch (error) {
      console.error('查词失败:', error)
      toast.error('查词失败，请稍后重试')
    }
  }

  // 添加单词到词汇库
  const handleAddWord = () => {
    if (!selectedWord || !token || !articleData?.data) return

    const context = getWordContext(selectedWord)
    addWordMutation.mutate({
      word: selectedWord,
      source_article_id: articleData.data.id,
      source_context: context
    })
  }

  // 获取单词上下文
  const getWordContext = (word: string): string => {
    if (!articleData?.data.content) return ''
    
    const content = articleData.data.content
    const wordIndex = content.toLowerCase().indexOf(word.toLowerCase())
    if (wordIndex === -1) return ''
    
    const start = Math.max(0, wordIndex - 50)
    const end = Math.min(content.length, wordIndex + word.length + 50)
    return content.substring(start, end)
  }

  // 渲染文章内容，添加单词点击功能
  const renderContent = (content: string) => {
    // 简单的单词分割和点击处理
    const words = content.split(/(\s+)/)
    return words.map((segment, index) => {
      const word = segment.trim()
      if (word && /^[a-zA-Z]+$/.test(word)) {
        return (
          <span
            key={index}
            className="cursor-pointer hover:bg-primary-100 rounded px-1 transition-colors"
            onClick={() => handleWordClick(word, getWordContext(word))}
          >
            {segment}
          </span>
        )
      }
      return <span key={index}>{segment}</span>
    })
  }

  // 主题样式
  const getThemeStyles = () => {
    switch (settings.theme) {
      case 'dark':
        return 'bg-gray-900 text-gray-100'
      case 'sepia':
        return 'bg-yellow-50 text-yellow-900'
      default:
        return 'bg-white text-secondary-900'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!articleData?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            文章未找到
          </h3>
          <Button onClick={() => navigate('/articles')}>
            返回文章列表
          </Button>
        </div>
      </div>
    )
  }

  const article = articleData.data

  return (
    <div className={`min-h-screen ${getThemeStyles()}`}>
      {/* 工具栏 */}
      <div className="sticky top-0 z-50 bg-white border-b border-secondary-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            {/* 返回按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/articles/${id}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>

            {/* 阅读进度 */}
            <div className="flex items-center gap-2">
              <div className="w-24 bg-secondary-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${readingProgress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-secondary-700">
                {Math.round(readingProgress)}%
              </span>
            </div>

            {/* 难度标识 */}
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              article.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
              article.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {article.difficulty === 'beginner' ? '初级' : 
               article.difficulty === 'intermediate' ? '中级' : '高级'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 设置按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* 更多选项 */}
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 文章内容 */}
      <div className="max-w-4xl mx-auto">
        {/* 文章标题 */}
        <div className="px-6 py-8 border-b border-secondary-200">
          <h1 
            className="text-3xl font-bold mb-4"
            style={{ 
              fontSize: `${settings.fontSize + 8}px`,
              fontFamily: settings.fontFamily === 'system' ? 'system-ui' : settings.fontFamily
            }}
          >
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-secondary-600">
            <span>📍 {article.category}</span>
            <span>📅 {new Date(article.created_at).toLocaleDateString('zh-CN')}</span>
            {article.source_name && <span>来源: {article.source_name}</span>}
          </div>
        </div>

        {/* 文章正文 */}
        <div
          ref={contentRef}
          className="px-6 py-8 reading-content overflow-y-auto"
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            fontFamily: settings.fontFamily === 'system' ? 'Georgia' : settings.fontFamily,
            maxHeight: 'calc(100vh - 200px)'
          }}
        >
          <div className="prose max-w-none">
            {renderContent(article.content)}
          </div>
        </div>
      </div>

      {/* 单词解释浮窗 */}
      {showDefinition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full max-h-96 overflow-y-auto">
            <Card.Content>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {selectedWord}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDefinition(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {wordDefinition ? (
                <div className="space-y-4">
                  {wordDefinition.pronunciation && (
                    <div className="flex items-center gap-2">
                      <span className="text-secondary-600">
                        /{wordDefinition.pronunciation}/
                      </span>
                      <Button variant="ghost" size="sm">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {wordDefinition.definitions.map((def, index) => (
                    <div key={index} className="border-l-4 border-primary-200 pl-4">
                      <div className="font-medium text-primary-600 mb-1">
                        {def.part_of_speech}
                      </div>
                      <div className="text-secondary-900 mb-2">
                        {def.definition}
                      </div>
                      {def.examples.length > 0 && (
                        <div className="text-sm text-secondary-600">
                          例句: {def.examples[0]}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2 pt-4 border-t">
                    {token && (
                      <Button
                        onClick={handleAddWord}
                        isLoading={addWordMutation.isLoading}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        加入单词库
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowDefinition(false)}
                    >
                      关闭
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-secondary-600 mt-2">查询中...</p>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      )}

      {/* 阅读设置面板 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <Card.Content>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">阅读设置</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* 字体设置 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Type className="h-4 w-4" />
                    <span className="font-medium">字体设置</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-secondary-600 mb-2">
                        字体大小
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">A-</span>
                        <input
                          type="range"
                          min="12"
                          max="24"
                          value={settings.fontSize}
                          onChange={(e) => setSettings({
                            ...settings,
                            fontSize: Number(e.target.value)
                          })}
                          className="flex-1"
                        />
                        <span className="text-lg">A+</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-secondary-600 mb-2">
                        行间距
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">━</span>
                        <input
                          type="range"
                          min="1.2"
                          max="2.0"
                          step="0.1"
                          value={settings.lineHeight}
                          onChange={(e) => setSettings({
                            ...settings,
                            lineHeight: Number(e.target.value)
                          })}
                          className="flex-1"
                        />
                        <span className="text-sm">≡</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 主题设置 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="h-4 w-4" />
                    <span className="font-medium">主题设置</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'light', label: '默认白色', icon: Sun },
                      { key: 'sepia', label: '护眼绿色', icon: Bookmark },
                      { key: 'dark', label: '深色模式', icon: Moon }
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setSettings({ ...settings, theme: key as any })}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          settings.theme === key
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-secondary-200 hover:border-secondary-300'
                        }`}
                      >
                        <Icon className="h-5 w-5 mx-auto mb-1" />
                        <div className="text-xs">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 功能设置 */}
                <div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">自动保存阅读进度</span>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          autoSave: !settings.autoSave
                        })}
                        className={`w-11 h-6 rounded-full transition-colors ${
                          settings.autoSave ? 'bg-primary-600' : 'bg-secondary-300'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          settings.autoSave ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">单词点击查询</span>
                      <button
                        onClick={() => setSettings({
                          ...settings,
                          wordClick: !settings.wordClick
                        })}
                        className={`w-11 h-6 rounded-full transition-colors ${
                          settings.wordClick ? 'bg-primary-600' : 'bg-secondary-300'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          settings.wordClick ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  )
}

export default ReadingPage 