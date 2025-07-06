import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zakcnyiyulntqkwgdiyd.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpha2NueWl5dWxudHFrd2dkaXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MTE2MjQsImV4cCI6MjA2NzE4NzYyNH0.JV56_qiE4ZDsy3pTp8XFU7Se5FWj80qeeHeAMIqjWfw'

// 디버깅용 로그
console.log('Supabase URL:', supabaseUrl)
console.log('환경변수 로드 확인:', {
  hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 2, // 실시간 이벤트 제한
    },
  },
})

// 팀 목록 상수
export const TEAMS = [
  '의국팀',
  '상담팀', 
  '코디팀',
  '간호팀',
  '피부팀',
  '경영지원팀'
]

// 휴무 유형 상수
export const HOLIDAY_TYPES = [
  '휴무',
  '연차',
  '오전반차',
  '오후반차',
  '오전+오후반차',
  '병가',
  '결근'
]

// 최적화된 쿼리 헬퍼 함수들
export const queries = {
  // 활성 직원만 조회 (성능 최적화)
  getActiveEmployees: () => {
    return supabase
      .from('employees')
      .select('*')
      .is('leave_date', null)
      .order('team', { ascending: true })
      .order('name', { ascending: true })
  },

  // 팀별 직원 조회 (필요한 컬럼만 선택)
  getEmployeesByTeam: (team) => {
    return supabase
      .from('employees')
      .select('id, name, join_date, leave_date')
      .eq('team', team)
      .order('name', { ascending: true })
  },

  // 특정 기간 휴무 조회 (인덱스 활용)
  getHolidaysByDateRange: (startDate, endDate, employeeIds = null) => {
    let query = supabase
      .from('holidays')
      .select('id, employee_id, holiday_date, holiday_type')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)

    if (employeeIds && employeeIds.length > 0) {
      query = query.in('employee_id', employeeIds)
    }

    return query.order('holiday_date', { ascending: true })
  },

  // 직원별 휴무 조회
  getEmployeeHolidays: (employeeId, startDate, endDate) => {
    return supabase
      .from('holidays')
      .select('holiday_date, holiday_type')
      .eq('employee_id', employeeId)
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate)
      .order('holiday_date', { ascending: true })
  },

  // 팀별 통계 조회 (집계 최적화)
  getTeamStats: async (team, year, month) => {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const [employeesRes, holidaysRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, name')
        .eq('team', team),
      supabase
        .from('holidays')
        .select('employee_id, holiday_type')
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDate)
    ])

    return {
      employees: employeesRes.data || [],
      holidays: holidaysRes.data || [],
      error: employeesRes.error || holidaysRes.error
    }
  }
}

// 캐시 관리 유틸리티
export const cache = {
  _storage: new Map(),
  _ttl: new Map(),

  set: (key, value, ttlMs = 300000) => { // 기본 5분 TTL
    cache._storage.set(key, value)
    cache._ttl.set(key, Date.now() + ttlMs)
  },

  get: (key) => {
    const ttl = cache._ttl.get(key)
    if (!ttl || Date.now() > ttl) {
      cache._storage.delete(key)
      cache._ttl.delete(key)
      return null
    }
    return cache._storage.get(key)
  },

  clear: () => {
    cache._storage.clear()
    cache._ttl.clear()
  },

  invalidate: (pattern) => {
    for (const key of cache._storage.keys()) {
      if (key.includes(pattern)) {
        cache._storage.delete(key)
        cache._ttl.delete(key)
      }
    }
  }
}

// 최적화된 데이터 로더
export const dataLoaders = {
  // 직원 데이터 로더 (캐싱 포함)
  loadEmployees: async (force = false) => {
    const cacheKey = 'employees_list'
    
    if (!force) {
      const cached = cache.get(cacheKey)
      if (cached) return cached
    }

    try {
      const { data, error } = await queries.getActiveEmployees()
      if (error) throw error

      cache.set(cacheKey, data, 600000) // 10분 캐시
      return data
    } catch (error) {
      console.error('직원 데이터 로드 실패:', error)
      throw error
    }
  },

  // 휴무 데이터 로더 (월별 캐싱)
  loadMonthlyHolidays: async (year, month, force = false) => {
    const cacheKey = `holidays_${year}_${month}`
    
    if (!force) {
      const cached = cache.get(cacheKey)
      if (cached) return cached
    }

    try {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]
      
      const { data, error } = await queries.getHolidaysByDateRange(startDate, endDate)
      if (error) throw error

      cache.set(cacheKey, data, 300000) // 5분 캐시
      return data
    } catch (error) {
      console.error('휴무 데이터 로드 실패:', error)
      throw error
    }
  }
}

// 배치 작업 유틸리티
export const batch = {
  // 대량 데이터 삽입 최적화
  insertMany: async (table, records, batchSize = 100) => {
    const results = []
    
    for (let i = 0; i < records.length; i += batchSize) {
      const chunk = records.slice(i, i + batchSize)
      try {
        const { data, error } = await supabase
          .from(table)
          .insert(chunk)
          .select()
        
        if (error) throw error
        results.push(...(data || []))
      } catch (error) {
        console.error(`배치 삽입 실패 (${i}-${i + chunk.length}):`, error)
        throw error
      }
    }
    
    return results
  },

  // 대량 데이터 업데이트 최적화
  updateMany: async (table, updates, idField = 'id') => {
    const results = []
    
    for (const update of updates) {
      try {
        const { [idField]: id, ...updateData } = update
        const { data, error } = await supabase
          .from(table)
          .update(updateData)
          .eq(idField, id)
          .select()
        
        if (error) throw error
        results.push(...(data || []))
      } catch (error) {
        console.error(`업데이트 실패 (${update[idField]}):`, error)
        throw error
      }
    }
    
    return results
  }
}

// 성능 모니터링 유틸리티
export const performance = {
  _metrics: new Map(),

  startTimer: (operation) => {
    performance._metrics.set(operation, Date.now())
  },

  endTimer: (operation) => {
    const start = performance._metrics.get(operation)
    if (start) {
      const duration = Date.now() - start
      console.log(`${operation} 실행 시간: ${duration}ms`)
      performance._metrics.delete(operation)
      return duration
    }
    return 0
  },

  measureQuery: async (operation, queryFn) => {
    performance.startTimer(operation)
    try {
      const result = await queryFn()
      performance.endTimer(operation)
      return result
    } catch (error) {
      performance.endTimer(operation)
      throw error
    }
  }
} 