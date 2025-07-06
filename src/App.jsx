import { useState, useEffect } from 'react'
import { Users, Calendar, Calculator, Menu, X } from 'lucide-react'
import EmployeeTab from './components/EmployeeTab'
import HolidayTab from './components/HolidayTab'
import CalculationTab from './components/CalculationTab'

function App() {
  const [activeTab, setActiveTab] = useState('employees')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 초기 로딩 애니메이션
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const tabs = [
    { id: 'employees', name: '직원 관리', icon: Users },
    { id: 'holidays', name: '휴무 달력', icon: Calendar },
    { id: 'calculations', name: '식대 계산', icon: Calculator }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'employees':
        return <EmployeeTab />
      case 'holidays':
        return <HolidayTab />
      case 'calculations':
        return <CalculationTab />
      default:
        return <EmployeeTab />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-primary-600 font-medium">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-primary-50 via-primary-100 to-primary-200 shadow-sm" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary-700 flex items-center gap-2 animate-fade-in">
                <span role="img" aria-label="휴무" className="text-3xl">📅</span>
                <span>휴무관리 시스템</span>
              </h1>
              <p className="text-primary-600 mt-1 animate-slide-in">직원 휴무 및 식대 관리 시스템</p>
            </div>
            
            {/* 모바일 메뉴 버튼 */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-primary-500 hover:text-primary-600 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <Menu className="w-6 h-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex space-x-8" role="tablist" aria-label="메인 네비게이션">
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' && index > 0) {
                      setActiveTab(tabs[index - 1].id)
                    } else if (e.key === 'ArrowRight' && index < tabs.length - 1) {
                      setActiveTab(tabs[index + 1].id)
                    }
                  }}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`group flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm transition-all hover:bg-primary-50 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-primary-600 hover:border-primary-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${
                    activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-primary-500'
                  }`} aria-hidden="true" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>

          {/* 모바일 네비게이션 */}
          <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
            <div className="py-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-600'
                        : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2" aria-hidden="true" />
                    {tab.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 탭 내용 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div 
          id={`${activeTab}-panel`}
          role="tabpanel"
          aria-labelledby={activeTab}
          tabIndex={0}
          className="animate-fade-in"
        >
          {renderTabContent()}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2024 휴무관리 시스템. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
