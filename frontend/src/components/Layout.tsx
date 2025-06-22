import React, { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header.tsx'
import Footer from './Footer.tsx'

interface LayoutProps {
  children?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-secondary-50">
      <Header />
      <main className="pt-16">
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  )
}

export default Layout