const Footer = () => {
  return (
    <footer className="bg-white border-t border-secondary-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-secondary-600 text-sm">
            © 2024 EnReading. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-secondary-600 hover:text-primary-600 text-sm">
              关于我们
            </a>
            <a href="#" className="text-secondary-600 hover:text-primary-600 text-sm">
              隐私政策
            </a>
            <a href="#" className="text-secondary-600 hover:text-primary-600 text-sm">
              服务条款
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 