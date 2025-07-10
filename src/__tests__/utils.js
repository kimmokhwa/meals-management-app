import { render } from '@testing-library/react'

// 테스트용 샘플 데이터
export const mockEmployees = [
  {
    id: 'emp1',
    name: '김철수',
    team: '의국팀',
    join_date: '2023-01-01',
    leave_date: null
  },
  {
    id: 'emp2',
    name: '이영희',
    team: '상담팀',
    join_date: '2023-02-01',
    leave_date: null
  },
  {
    id: 'emp3',
    name: '박민수',
    team: '코디팀',
    join_date: '2023-01-15',
    leave_date: '2023-12-31'
  }
]

export const mockHolidays = [
  {
    id: 'hol1',
    employee_id: 'emp1',
    holiday_date: '2024-01-15',
    holiday_type: '연차'
  },
  {
    id: 'hol2',
    employee_id: 'emp2',
    holiday_date: '2024-01-16',
    holiday_type: '오전반차'
  }
]

export const mockCalculations = [
  {
    employee_id: 'emp1',
    employee_name: '김철수',
    team: '의국팀',
    total_days: 31,
    work_days: 22,
    off_days: 2,
    half_days: 1,
    sundays: 4,
    total_allowance: 176000,
    is_active: true
  }
]

// 커스텀 렌더 함수
export const customRender = (ui, options = {}) => {
  return render(ui, {
    // wrapper를 추가하려면 여기에 Provider 등을 넣을 수 있음
    ...options,
  })
}

// 날짜 유틸리티
export const createMockDate = (year, month, day) => {
  return new Date(year, month - 1, day)
}

// 이벤트 시뮬레이션 유틸리티
export const mockSupabaseQuery = (data, error = null) => {
  return {
    data,
    error,
    select: () => mockSupabaseQuery(data, error),
    insert: () => mockSupabaseQuery(data, error),
    update: () => mockSupabaseQuery(data, error),
    delete: () => mockSupabaseQuery(data, error),
    eq: () => mockSupabaseQuery(data, error),
    gte: () => mockSupabaseQuery(data, error),
    lte: () => mockSupabaseQuery(data, error),
    order: () => mockSupabaseQuery(data, error),
    is: () => mockSupabaseQuery(data, error),
  }
}

// 비동기 테스트 유틸리티
export const waitForAsync = (ms = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 로컬 스토리지 모킹
export const mockLocalStorage = () => {
  const store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value },
    removeItem: (key) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(key => delete store[key]) }
  }
}

// 에러 시뮬레이션
export const mockError = (message = 'Test error') => {
  return new Error(message)
} 