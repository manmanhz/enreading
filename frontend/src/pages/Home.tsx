import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Trophy, Zap } from 'lucide-react'
import { articleApi } from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

const Home = () => {
  const { data: popularArticles } = useQuery(
    'popular-articles',
    () => articleApi.getPopular(6),
    { enabled: true }
  )

  const features = [
    {
      icon: BookOpen,
      title: '丰富文章',
      description: '精选英语文章，涵盖各个难度级别和主题',
    },
    {
      icon: Users,
      title: '智能词汇',
      description: '个人词汇库管理，智能复习提醒',
    },
    {
      icon: Trophy,
      title: '进度跟踪',
      description: '详细的阅读统计和进度分析',
    },
    {
      icon: Zap,
      title: '即时查词',
      description: '集成多源字典，一键查词添加到词库',
    },
  ]

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              开启你的英语阅读之旅
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto">
              通过精选文章提升英语阅读能力，智能词汇管理让学习更高效
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-50">
                  免费开始
                </Button>
              </Link>
              <Link to="/articles">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-600">
                  浏览文章
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-secondary-900 mb-4">
            为什么选择 EnReading？
          </h2>
          <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
            我们提供完整的英语阅读学习解决方案，帮助您高效提升英语水平
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <feature.icon className="h-12 w-12 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-secondary-600">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Popular Articles Section */}
      {popularArticles?.data && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              热门文章
            </h2>
            <p className="text-lg text-secondary-600">
              看看其他学习者正在阅读什么
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {popularArticles.data.slice(0, 6).map((article) => (
              <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {article.image_url && (
                  <div className="h-48 bg-secondary-200">
                    <img 
                      src={article.image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <Card.Content>
                  <div className="flex items-center gap-2 text-sm text-secondary-500 mb-2">
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded">
                      {article.difficulty}
                    </span>
                    <span>{article.category}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-secondary-600 text-sm line-clamp-3 mb-4">
                    {article.summary}
                  </p>
                  <Link to={`/articles/${article.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      阅读文章
                    </Button>
                  </Link>
                </Card.Content>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/articles">
              <Button size="lg">
                查看更多文章
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-secondary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              准备开始学习了吗？
            </h2>
            <p className="text-lg text-secondary-600 mb-8 max-w-2xl mx-auto">
              注册账户，开始个性化的英语阅读学习之旅
            </p>
            <Link to="/register">
              <Button size="lg">
                免费注册
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home 