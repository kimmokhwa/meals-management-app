import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from '../../App'

// Mock the child components
vi.mock('../EmployeeTab', () => ({
  default: () => <div data-testid="employee-tab">직원 관리 탭</div>
}))

vi.mock('../HolidayTab', () => ({
  default: () => <div data-testid="holiday-tab">휴무 달력 탭</div>
}))

vi.mock('../CalculationTab', () => ({
  default: () => <div data-testid="calculation-tab">식대 계산 탭</div>
}))

describe('App 컴포넌트', () => {
  it('렌더링이 정상적으로 되어야 한다', () => {
    render(<App />)
    
    // 헤더가 렌더링되는지 확인
    expect(screen.getByText('식대 관리 시스템')).toBeInTheDocument()
    expect(screen.getByText('직원 식대 관리 및 계산 시스템')).toBeInTheDocument()
  })

  it('탭 네비게이션이 올바르게 렌더링되어야 한다', () => {
    render(<App />)
    
    // 모든 탭 버튼이 있는지 확인
    expect(screen.getByRole('tab', { name: /직원 관리/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /휴무 달력/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /식대 계산/i })).toBeInTheDocument()
  })

  it('첫 번째 탭이 기본으로 활성화되어야 한다', () => {
    render(<App />)
    
    // 첫 번째 탭이 활성 상태인지 확인
    const firstTab = screen.getByRole('tab', { name: /직원 관리/i })
    expect(firstTab).toHaveClass('border-primary-blue', 'text-primary-blue')
    
    // 첫 번째 탭 내용이 표시되는지 확인
    expect(screen.getByTestId('employee-tab')).toBeInTheDocument()
  })

  it('탭 클릭 시 해당 탭이 활성화되어야 한다', () => {
    render(<App />)
    
    // 두 번째 탭 클릭
    const holidayTab = screen.getByRole('tab', { name: /휴무 달력/i })
    fireEvent.click(holidayTab)
    
    // 두 번째 탭이 활성 상태가 되고 내용이 표시되는지 확인
    expect(holidayTab).toHaveClass('border-primary-blue', 'text-primary-blue')
    expect(screen.getByTestId('holiday-tab')).toBeInTheDocument()
    
    // 첫 번째 탭은 비활성 상태가 되어야 함
    const employeeTab = screen.getByRole('tab', { name: /직원 관리/i })
    expect(employeeTab).toHaveClass('border-transparent', 'text-gray-500')
  })

  it('키보드 네비게이션이 작동해야 한다', () => {
    render(<App />)
    
    const tabList = screen.getByRole('tablist')
    
    // 오른쪽 화살표 키 이벤트
    fireEvent.keyDown(tabList, { key: 'ArrowRight' })
    
    // 두 번째 탭이 포커스되어야 함
    const holidayTab = screen.getByRole('tab', { name: /휴무 달력/i })
    expect(holidayTab).toHaveFocus()
  })

  it('접근성 속성들이 올바르게 설정되어야 한다', () => {
    render(<App />)
    
    // ARIA 속성들 확인
    const tabList = screen.getByRole('tablist')
    expect(tabList).toBeInTheDocument()
    
    const tabs = screen.getAllByRole('tab')
    tabs.forEach((tab, index) => {
      expect(tab).toHaveAttribute('aria-selected', index === 0 ? 'true' : 'false')
      expect(tab).toHaveAttribute('tabindex', index === 0 ? '0' : '-1')
    })
  })

  it('반응형 디자인 클래스가 적용되어야 한다', () => {
    render(<App />)
    
    const container = screen.getByTestId('main-container') || screen.getByRole('main')
    expect(container).toHaveClass('min-h-screen', 'bg-gray-50')
  })

  it('모든 탭에서 전환이 정상적으로 작동해야 한다', () => {
    render(<App />)
    
    const tabs = [
      { name: /직원 관리/i, testId: 'employee-tab' },
      { name: /휴무 달력/i, testId: 'holiday-tab' },
      { name: /식대 계산/i, testId: 'calculation-tab' }
    ]
    
    tabs.forEach(({ name, testId }) => {
      const tab = screen.getByRole('tab', { name })
      fireEvent.click(tab)
      
      expect(screen.getByTestId(testId)).toBeInTheDocument()
      expect(tab).toHaveClass('border-primary-blue', 'text-primary-blue')
    })
  })
}) 