import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../lib/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { RegisterRequest } from '../types'

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterRequest & { confirmPassword: string }>()

  const onSubmit = async (data: RegisterRequest & { confirmPassword: string }) => {
    if (data.password !== data.confirmPassword) {
      toast.error('两次密码输入不一致')
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.register({
        username: data.username,
        email: data.email,
        password: data.password,
      })
      if (response.success) {
        login(response.data.user, response.data.token)
        toast.success('注册成功！')
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Register error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-secondary-900">
          创建账户
        </h2>
        <p className="mt-2 text-sm text-secondary-600">
          已有账户？{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-500">
            立即登录
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="用户名"
          type="text"
          placeholder="请输入用户名"
          error={errors.username?.message}
          {...register('username', {
            required: '用户名不能为空',
            minLength: {
              value: 3,
              message: '用户名至少3位',
            },
            maxLength: {
              value: 30,
              message: '用户名最多30位',
            },
          })}
        />

        <Input
          label="邮箱地址"
          type="email"
          placeholder="请输入邮箱地址"
          error={errors.email?.message}
          {...register('email', {
            required: '邮箱地址不能为空',
            pattern: {
              value: /^\S+@\S+$/i,
              message: '邮箱格式不正确',
            },
          })}
        />

        <div className="relative">
          <Input
            label="密码"
            type={showPassword ? 'text' : 'password'}
            placeholder="请输入密码"
            error={errors.password?.message}
            {...register('password', {
              required: '密码不能为空',
              minLength: {
                value: 6,
                message: '密码至少6位',
              },
            })}
          />
          <button
            type="button"
            className="absolute right-3 top-8 text-secondary-400 hover:text-secondary-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <Input
          label="确认密码"
          type={showPassword ? 'text' : 'password'}
          placeholder="请再次输入密码"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: '请确认密码',
            validate: (value) =>
              value === watch('password') || '两次密码输入不一致',
          })}
        />

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              required
              className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <span className="text-secondary-600">
              我同意{' '}
              <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                服务条款
              </Link>{' '}
              和{' '}
              <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                隐私政策
              </Link>
            </span>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
        >
          注册
        </Button>
      </form>
    </div>
  )
}

export default Register 