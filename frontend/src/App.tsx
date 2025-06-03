import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout.tsx'
import AuthLayout from './components/AuthLayout.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import Articles from './pages/Articles.tsx'
import ArticleDetail from './pages/ArticleDetail.tsx'
import ReadingPage from './pages/ReadingPage.tsx'
import Vocabulary from './pages/Vocabulary.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Profile from './pages/Profile.tsx'

function App() {
  const { token } = useAuthStore()

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    return token ? <>{children}</> : <Navigate to="/login" replace />
  }

  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    return !token ? <>{children}</> : <Navigate to="/dashboard" replace />
  }

  return (
    <Routes>
      {/* 公共路由 */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="articles" element={<Articles />} />
        <Route path="articles/:id" element={<ArticleDetail />} />
      </Route>

      {/* 认证路由 */}
      <Route path="/" element={<AuthLayout />}>
        <Route path="login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
      </Route>

      {/* 受保护的路由 */}
      <Route path="/" element={<Layout />}>
        <Route path="dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="reading/:id" element={
          <ProtectedRoute>
            <ReadingPage />
          </ProtectedRoute>
        } />
        <Route path="vocabulary" element={
          <ProtectedRoute>
            <Vocabulary />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
      </Route>

      {/* 404 路由 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App 