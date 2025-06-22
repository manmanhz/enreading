import React, { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { vocabularyApi } from '../lib/api'
import { VocabularyWord } from '../types'
import toast from 'react-hot-toast'

type PracticeMode = 'definition_to_word' | 'chinese_to_word' | 'word_to_chinese'

interface Question {
  id: number
  word: string
  question: string
  options: string[]
  correctAnswer: string
  pronunciation?: string
  part_of_speech?: string
}

interface PracticeResult {
  word: string
  isCorrect: boolean
  userAnswer: string
  correctAnswer: string
}

const Vocabulary = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'practice'>('list')
  const [words, setWords] = useState<VocabularyWord[]>([])
  const [loading, setLoading] = useState(false)
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('definition_to_word')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [practiceResults, setPracticeResults] = useState<PracticeResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [practiceStats, setPracticeStats] = useState<any>(null)

  // 获取单词列表
  const fetchWords = useCallback(async () => {
    try {
      setLoading(true)
      const response = await vocabularyApi.getWords({ page: 1, limit: 100 })
      if (response.success) {
        const wordsData = response.data.words || []
        setWords(wordsData)
      }
    } catch (error) {
      toast.error('获取单词列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 开始练习
  const startPractice = async () => {
    try {
      setLoading(true)
      const response = await vocabularyApi.getPracticeQuiz(practiceMode, 10)
      if (response.success) {
        setQuestions(response.data.questions)
        setCurrentQuestionIndex(0)
        setSelectedAnswer('')
        setPracticeResults([])
        setShowResults(false)
      }
    } catch (error) {
      toast.error('获取练习题目失败')
    } finally {
      setLoading(false)
    }
  }

  // 提交答案
  const submitAnswer = () => {
    if (!selectedAnswer) {
      toast.error('请选择一个答案')
      return
    }

    const currentQuestion = questions[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    
    const result: PracticeResult = {
      word: currentQuestion.word,
      isCorrect,
      userAnswer: selectedAnswer,
      correctAnswer: currentQuestion.correctAnswer
    }

    setPracticeResults(prev => [...prev, result])
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer('')
    } else {
      // 练习完成，提交结果
      finishPractice([...practiceResults, result])
    }
  }

  // 完成练习
  const finishPractice = async (results: PracticeResult[]) => {
    try {
      const response = await vocabularyApi.submitPracticeResult({
        mode: practiceMode,
        results
      })
      if (response.success) {
        setPracticeStats(response.data)
        setShowResults(true)
      }
    } catch (error) {
      toast.error('提交练习结果失败')
    }
  }

  // 重新开始练习
  const restartPractice = () => {
    setQuestions([])
    setCurrentQuestionIndex(0)
    setSelectedAnswer('')
    setPracticeResults([])
    setShowResults(false)
    setPracticeStats(null)
  }

  useEffect(() => {
    if (activeTab === 'list') {
      fetchWords()
    }
  }, [activeTab, fetchWords])

  const getModeTitle = (mode: PracticeMode) => {
    switch (mode) {
      case 'definition_to_word':
        return '看英文解释选单词'
      case 'chinese_to_word':
        return '看中文选单词'
      case 'word_to_chinese':
        return '看英文选中文解释'
      default:
        return ''
    }
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">我的单词库</h1>
        
        {/* 标签页 */}
        <div className="flex space-x-4 mb-8">
          <Button
            variant={activeTab === 'list' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('list')}
          >
            单词列表
          </Button>
          <Button
            variant={activeTab === 'practice' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('practice')}
          >
            背诵练习
          </Button>
        </div>

        {/* 单词列表 */}
        {activeTab === 'list' && (
          <div>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">加载中...</p>
              </div>
            ) : words.length === 0 ? (
              <Card>
                 <Card.Content className="text-center py-8">
                   <p className="text-gray-500">暂无单词，请先在阅读页面添加单词到词库</p>
                 </Card.Content>
               </Card>
            ) : (
              <div className="grid gap-4">
                {words.map((word) => (
                  <Card key={word.id}>
                     <Card.Content className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold">{word.word}</h3>
                            {word.pronunciation && (
                              <span className="text-sm text-gray-500">/{word.pronunciation}/</span>
                            )}
                            {word.part_of_speech && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {word.part_of_speech}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 mb-2">{word.definition}</p>
                          {word.example_sentence && (
                            <p className="text-sm text-gray-600 italic">例句: {word.example_sentence}</p>
                          )}
                          {word.context && (
                            <p className="text-sm text-gray-500 mt-2">上下文: {word.context}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 mb-1">
                            掌握度: <span className={`font-medium ${
                              word.mastery_level === 'mastered' ? 'text-green-600' :
                              word.mastery_level === 'familiar' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {word.mastery_level === 'mastered' ? '已掌握' :
                               word.mastery_level === 'familiar' ? '熟悉' : '学习中'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            复习次数: {word.review_count}
                          </div>
                        </div>
                      </div>
                    </Card.Content>
                   </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 背诵练习 */}
        {activeTab === 'practice' && (
          <div>
            {!questions.length && !showResults ? (
              <Card>
                 <Card.Header>
                   <h2 className="text-2xl font-semibold">选择练习模式</h2>
                 </Card.Header>
                 <Card.Content>
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      {(['definition_to_word', 'chinese_to_word', 'word_to_chinese'] as PracticeMode[]).map((mode) => (
                        <label key={mode} className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="practiceMode"
                            value={mode}
                            checked={practiceMode === mode}
                            onChange={(e) => setPracticeMode(e.target.value as PracticeMode)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div>
                            <div className="font-medium">{getModeTitle(mode)}</div>
                            <div className="text-sm text-gray-500">
                              {mode === 'definition_to_word' && '根据英文解释选择对应的单词'}
                              {mode === 'chinese_to_word' && '根据中文释义选择对应的单词'}
                              {mode === 'word_to_chinese' && '根据英文单词选择对应的中文解释'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <Button
                      onClick={startPractice}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? '准备中...' : '开始练习'}
                    </Button>
                  </div>
                </Card.Content>
               </Card>
            ) : showResults ? (
              <Card>
                 <Card.Header>
                   <h2 className="text-2xl font-semibold">练习结果</h2>
                 </Card.Header>
                 <Card.Content>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {practiceStats?.accuracy}%
                      </div>
                      <div className="text-gray-600">
                        {practiceStats?.correctAnswers} / {practiceStats?.totalQuestions} 题正确
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {practiceResults.map((result, index) => (
                        <div key={index} className={`p-3 rounded-lg border ${
                          result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{result.word}</span>
                            <span className={`text-sm ${
                              result.isCorrect ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {result.isCorrect ? '✓ 正确' : '✗ 错误'}
                            </span>
                          </div>
                          {!result.isCorrect && (
                            <div className="text-sm text-gray-600 mt-1">
                              你的答案: {result.userAnswer} | 正确答案: {result.correctAnswer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button onClick={restartPractice} variant="outline" className="flex-1">
                        重新练习
                      </Button>
                      <Button onClick={() => setActiveTab('list')} className="flex-1">
                        返回单词列表
                      </Button>
                    </div>
                  </div>
                </Card.Content>
               </Card>
             ) : (
               <Card>
                 <Card.Header>
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold">{getModeTitle(practiceMode)}</h2>
                    <span className="text-sm text-gray-500">
                      {currentQuestionIndex + 1} / {questions.length}
                    </span>
                  </div>
                </Card.Header>
                 <Card.Content>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-xl font-medium mb-4">{currentQuestion?.question}</div>
                      {currentQuestion?.pronunciation && practiceMode !== 'word_to_chinese' && (
                        <div className="text-sm text-gray-500">/{currentQuestion.pronunciation}/</div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {currentQuestion?.options.map((option, index) => (
                        <label key={index} className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="answer"
                            value={option}
                            checked={selectedAnswer === option}
                            onChange={(e) => setSelectedAnswer(e.target.value)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    
                    <Button
                      onClick={submitAnswer}
                      disabled={!selectedAnswer}
                      className="w-full"
                    >
                      {currentQuestionIndex === questions.length - 1 ? '完成练习' : '下一题'}
                    </Button>
                  </div>
                </Card.Content>
               </Card>
            )}
          </div>
        )}
    </div>
  )
}

export default Vocabulary