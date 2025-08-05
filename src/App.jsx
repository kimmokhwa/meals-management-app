import { useState, useEffect } from 'react'
import { Users, Calendar, Calculator, Menu, X, Lock } from 'lucide-react'
import EmployeeTab from './components/EmployeeTab'
import HolidayTab from './components/HolidayTab'
import CalculationTab from './components/CalculationTab'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('holiday')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(true)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // 비밀번호 확인 (실제 구현시에는 더 안전한 방식으로 처리해야 함)
  const ADMIN_PASSWORD = '1234'

  useEffect(() => {
    // 초기 로딩 애니메이션
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const tabs = [
    { id: 'holiday', name: '휴무 달력', icon: Calendar },
    { id: 'employees', name: '직원 관리', icon: Users },
    { id: 'calculations', name: '식대 계산', icon: Calculator }
  ]

  const handleUnlock = () => {
    if (password === ADMIN_PASSWORD) {
      setIsLocked(false)
      setShowUnlockModal(false)
      setPassword('')
      setError('')
    } else {
      setError('비밀번호가 올바르지 않습니다.')
    }
  }

  const handleTabClick = (tab) => {
    if ((tab === 'employees' || tab === 'calculations') && isLocked) {
      setShowUnlockModal(true)
    } else {
      setActiveTab(tab)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'holiday':
        return <HolidayTab />
      case 'employees':
        return !isLocked && <EmployeeTab />
      case 'calculations':
        return !isLocked && <CalculationTab />
      default:
        return <HolidayTab />
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
      <header className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 shadow-lg border-b-4 border-pink-300" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-purple-700 flex items-center gap-3 animate-fade-in">
                <span role="img" aria-label="휴무" className="text-4xl animate-bounce">🌸</span>
                <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">휴무관리 시스템</span>
                <span role="img" aria-label="하트" className="text-2xl animate-pulse">💖</span>
              </h1>
              <p className="text-purple-600 mt-2 animate-slide-in text-lg font-medium flex items-center gap-2">
                <span role="img" aria-label="별" className="text-yellow-400">⭐</span>
                직원 휴무 및 식대 관리 시스템
                <span role="img" aria-label="별" className="text-yellow-400">⭐</span>
              </p>
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
      <div className="bg-gradient-to-r from-white via-pink-50 to-purple-50 shadow-md border-b-2 border-pink-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex space-x-8" role="tablist" aria-label="메인 네비게이션">
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' && index > 0) {
                      handleTabClick(tabs[index - 1].id)
                    } else if (e.key === 'ArrowRight' && index < tabs.length - 1) {
                      handleTabClick(tabs[index + 1].id)
                    }
                  }}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`group flex items-center space-x-2 py-4 px-4 border-b-3 font-medium text-sm transition-all hover:bg-pink-50 rounded-t-lg ${
                    activeTab === tab.id
                      ? 'border-pink-400 text-pink-600 bg-pink-50 shadow-md'
                      : 'border-transparent text-gray-500 hover:text-pink-600 hover:border-pink-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${
                    activeTab === tab.id ? 'text-pink-500' : 'text-gray-400 group-hover:text-pink-500'
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
                      handleTabClick(tab.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-pink-100 text-pink-600 shadow-sm'
                        : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'
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
      <footer className="bg-gradient-to-r from-pink-50 to-purple-50 border-t-2 border-pink-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-purple-600 font-medium flex items-center justify-center gap-2">
            <span role="img" aria-label="하트" className="animate-pulse">💕</span>
            © 2024 휴무관리 시스템. All rights reserved.
            <span role="img" aria-label="하트" className="animate-pulse">💕</span>
          </p>
        </div>
      </footer>

      {/* 잠금 해제 모달 */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              관리자 인증
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                  placeholder="비밀번호를 입력하세요"
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUnlockModal(false)
                    setPassword('')
                    setError('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
                >
                  취소
                </button>
                <button
                  onClick={handleUnlock}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
