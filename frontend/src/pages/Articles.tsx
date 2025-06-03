import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { Search, Filter, Clock, BookOpen, Star, Play, RotateCcw } from 'lucide-react'
import { articleApi } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Article } from '../types'

const Articles = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const { token } = useAuthStore()

  // 获取文章列表
  const { data: articlesData, isLoading, error, refetch } = useQuery(
    ['articles', currentPage, selectedCategory, selectedDifficulty, searchQuery],
    () => articleApi.getList({
      page: currentPage,
      limit: 12,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty,
    }),
    { enabled: true }
  )

  // 获取分类列表
  const { data: categoriesData } = useQuery(
    'categories',
    () => articleApi.getCategories(),
    { enabled: true }
  )

  // 搜索功能
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        const response = await articleApi.search(searchQuery, currentPage, 12)
        // 这里可以更新搜索结果状态
      } catch (error) {
        console.error('Search error:', error)
      }
    } else {
      refetch()
    }
  }

  // 重置筛选
  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedDifficulty('all')
    setCurrentPage(1)
  }

  // 难度颜色映射
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 格式化阅读时间
  const formatReadingTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分钟`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小时${mins}分钟`
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">加载文章时出错</p>
          <Button onClick={() => refetch()}>重试</Button>
        </div>
      </div>
    )
  }

  const articles = articlesData?.data?.articles || []
  const totalPages = articlesData?.data?.totalPages || 1

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">文章阅读</h1>
          <p className="text-secondary-600 mt-2">
            发现精彩的英语文章，提升阅读技能
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          筛选
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card className="mb-6">
        <Card.Content className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              type="text"
              placeholder="搜索文章标题、内容或关键词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <Button onClick={handleSearch}>搜索</Button>
        </Card.Content>
      </Card>

      {/* 筛选面板 */}
      {showFilters && (
        <Card className="mb-6">
          <Card.Content>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 分类筛选 */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  文章分类
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">全部分类</option>
                  {categoriesData?.data?.map((cat: any) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* 难度筛选 */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  阅读难度
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full border border-secondary-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">全部难度</option>
                  <option value="beginner">初级</option>
                  <option value="intermediate">中级</option>
                  <option value="advanced">高级</option>
                </select>
              </div>

              {/* 重置按钮 */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  重置筛选
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* 文章网格 */}
      {articles.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-secondary-400 mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            没有找到文章
          </h3>
          <p className="text-secondary-600">
            尝试调整搜索条件或筛选选项
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {articles.map((article: Article) => (
            <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              {/* 文章图片 */}
              {article.image_url ? (
                <div className="h-48 bg-secondary-200 overflow-hidden">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-primary-600" />
                </div>
              )}

              <Card.Content>
                {/* 文章元信息 */}
                <div className="flex items-center gap-2 text-sm text-secondary-500 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(article.difficulty)}`}>
                    {article.difficulty === 'beginner' ? '初级' : 
                     article.difficulty === 'intermediate' ? '中级' : '高级'}
                  </span>
                  <span>{article.category}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatReadingTime(article.estimated_time)}
                  </div>
                </div>

                {/* 文章标题 */}
                <h3 className="text-lg font-semibold text-secondary-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {article.title}
                </h3>

                {/* 文章摘要 */}
                <p className="text-secondary-600 text-sm line-clamp-3 mb-4">
                  {article.summary}
                </p>

                {/* 阅读进度（如果已登录且有进度） */}
                {token && article.reading_progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-secondary-600 mb-1">
                      <span>阅读进度</span>
                      <span>{Math.round(article.reading_progress)}%</span>
                    </div>
                    <div className="w-full bg-secondary-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${article.reading_progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {article.source_name && (
                      <span className="text-xs text-secondary-500">
                        来源: {article.source_name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {token && article.reading_progress && article.reading_progress > 0 ? (
                      <Link to={`/reading/${article.id}`}>
                        <Button size="sm" className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          继续阅读
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/articles/${article.id}`}>
                        <Button variant="outline" size="sm">
                          查看详情
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            上一页
          </Button>
          
          {[...Array(totalPages)].map((_, index) => {
            const page = index + 1
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 2 && page <= currentPage + 2)
            ) {
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              )
            } else if (page === currentPage - 3 || page === currentPage + 3) {
              return <span key={page} className="px-2">...</span>
            }
            return null
          })}

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}

export default Articles 