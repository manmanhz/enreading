import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Tag, 
  Globe, 
  Play, 
  BookOpen,
  Heart,
  Share2,
  Download,
  Eye,
  Users
} from 'lucide-react'
import { articleApi } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

const ArticleDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token, user } = useAuthStore()
  const [isFavorited, setIsFavorited] = useState(false)

  // 获取文章详情
  const { data: articleData, isLoading, error } = useQuery(
    ['article', id],
    () => articleApi.getById(Number(id)),
    { enabled: !!id }
  )

  // 获取推荐文章
  const { data: popularArticles } = useQuery(
    'popular-articles-detail',
    () => articleApi.getPopular(4),
    { enabled: true }
  )

  // 开始阅读的mutation
  const startReadingMutation = useMutation(
    () => articleApi.updateProgress(Number(id), { reading_progress: 0, reading_duration: 0 }),
    {
      onSuccess: () => {
        navigate(`/reading/${id}`)
      },
      onError: () => {
        toast.error('开始阅读失败')
      }
    }
  )

  // 分享功能
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article?.title,
        text: article?.summary,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('链接已复制到剪贴板')
    }
  }

  // 收藏功能
  const handleFavorite = () => {
    if (!token) {
      toast.error('请先登录')
      return
    }
    setIsFavorited(!isFavorited)
    toast.success(isFavorited ? '已取消收藏' : '已收藏文章')
  }

  // 难度颜色映射
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !articleData?.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-secondary-400 mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            文章未找到
          </h3>
          <p className="text-secondary-600 mb-4">
            抱歉，您要查看的文章不存在或已被删除
          </p>
          <Button onClick={() => navigate('/articles')}>
            返回文章列表
          </Button>
        </div>
      </div>
    )
  }

  const article = articleData.data

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/articles')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Button>
      </div>

      {/* 文章头部 */}
      <Card className="mb-8">
        {/* 文章图片 */}
        {article.image_url && (
          <div className="h-64 md:h-80 bg-secondary-200 overflow-hidden rounded-t-lg">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <Card.Content className="space-y-6">
          {/* 文章元信息 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-600">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(article.difficulty)}`}>
              {article.difficulty === 'beginner' ? '初级' : 
               article.difficulty === 'intermediate' ? '中级' : '高级'}
            </span>
            
            <div className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              {article.category}
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              预计阅读 {formatReadingTime(article.estimated_time)}
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(article.created_at)}
            </div>
            
            {article.source_name && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                {article.source_name}
              </div>
            )}
          </div>

          {/* 文章标题 */}
          <h1 className="text-3xl md:text-4xl font-bold text-secondary-900 leading-tight">
            {article.title}
          </h1>

          {/* 文章摘要 */}
          <p className="text-lg text-secondary-700 leading-relaxed">
            {article.summary}
          </p>

          {/* 阅读进度（如果已登录且有进度） */}
          {token && article.reading_progress !== undefined && article.reading_progress > 0 && (
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-primary-700">
                  阅读进度
                </span>
                <span className="text-sm text-primary-600">
                  {Math.round(article.reading_progress)}%
                </span>
              </div>
              <div className="w-full bg-primary-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${article.reading_progress}%` }}
                />
              </div>
              <p className="text-sm text-primary-600 mt-2">
                {article.reading_progress === 100 ? '已完成阅读' : '继续上次的阅读进度'}
              </p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap items-center gap-4">
            {/* 主要操作 */}
            <div className="flex gap-3">
              {token && article.reading_progress && article.reading_progress > 0 ? (
                <Button
                  size="lg"
                  onClick={() => navigate(`/reading/${article.id}`)}
                  className="flex items-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  继续阅读
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => {
                    if (token) {
                      startReadingMutation.mutate()
                    } else {
                      navigate(`/reading/${article.id}`)
                    }
                  }}
                  isLoading={startReadingMutation.isLoading}
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-5 w-5" />
                  开始阅读
                </Button>
              )}
            </div>

            {/* 次要操作 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleFavorite}
                className={`flex items-center gap-2 ${isFavorited ? 'text-red-600 border-red-300' : ''}`}
              >
                <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                {isFavorited ? '已收藏' : '收藏'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                分享
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* 文章统计信息 */}
      <Card className="mb-8">
        <Card.Content>
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            文章信息
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {article.content.length}
              </div>
              <div className="text-sm text-secondary-600">字符数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {article.content.split(' ').length}
              </div>
              <div className="text-sm text-secondary-600">单词数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {formatReadingTime(article.estimated_time)}
              </div>
              <div className="text-sm text-secondary-600">预计时长</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {article.difficulty === 'beginner' ? '初级' : 
                 article.difficulty === 'intermediate' ? '中级' : '高级'}
              </div>
              <div className="text-sm text-secondary-600">难度等级</div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* 推荐文章 */}
      {popularArticles?.data && popularArticles.data.length > 0 && (
        <Card>
          <Card.Content>
            <h3 className="text-lg font-semibold text-secondary-900 mb-6">
              推荐阅读
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {popularArticles.data.slice(0, 4).map((recommendedArticle: any) => (
                <Link
                  key={recommendedArticle.id}
                  to={`/articles/${recommendedArticle.id}`}
                  className="block group"
                >
                  <div className="border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      {recommendedArticle.image_url ? (
                        <img
                          src={recommendedArticle.image_url}
                          alt={recommendedArticle.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-primary-100 rounded flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-primary-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-secondary-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {recommendedArticle.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-sm text-secondary-500">
                          <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(recommendedArticle.difficulty)}`}>
                            {recommendedArticle.difficulty === 'beginner' ? '初级' : 
                             recommendedArticle.difficulty === 'intermediate' ? '中级' : '高级'}
                          </span>
                          <span>{recommendedArticle.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  )
}

export default ArticleDetail 