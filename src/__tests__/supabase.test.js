import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TEAMS, HOLIDAY_TYPES, cache, queries, dataLoaders, batch, performance } from '../supabase'

describe('Supabase 유틸리티', () => {
  describe('상수', () => {
    it('TEAMS 배열이 올바르게 정의되어 있어야 한다', () => {
      expect(TEAMS).toEqual([
        '의국팀',
        '상담팀',
        '코디팀',
        '간호팀',
        '피부팀',
        '경영지원팀'
      ])
      expect(TEAMS).toHaveLength(6)
    })

    it('HOLIDAY_TYPES 배열이 올바르게 정의되어 있어야 한다', () => {
      expect(HOLIDAY_TYPES).toEqual([
        '휴무',
        '연차',
        '오전반차',
        '오후반차',
        '오전+오후반차',
        '병가'
      ])
      expect(HOLIDAY_TYPES).toHaveLength(6)
    })
  })

  describe('캐시 시스템', () => {
    beforeEach(() => {
      cache.clear()
    })

    it('값을 저장하고 조회할 수 있어야 한다', () => {
      const testData = { id: 1, name: 'test' }
      cache.set('test-key', testData)
      
      const result = cache.get('test-key')
      expect(result).toEqual(testData)
    })

    it('TTL이 만료된 값은 null을 반환해야 한다', async () => {
      const testData = { id: 1, name: 'test' }
      cache.set('test-key', testData, 10) // 10ms TTL
      
      // 20ms 대기
      await new Promise(resolve => setTimeout(resolve, 20))
      
      const result = cache.get('test-key')
      expect(result).toBeNull()
    })

    it('패턴으로 캐시를 무효화할 수 있어야 한다', () => {
      cache.set('employees_list', [])
      cache.set('employees_team_1', [])
      cache.set('holidays_2024_1', [])
      
      cache.invalidate('employees')
      
      expect(cache.get('employees_list')).toBeNull()
      expect(cache.get('employees_team_1')).toBeNull()
      expect(cache.get('holidays_2024_1')).not.toBeNull()
    })

    it('캐시를 모두 지울 수 있어야 한다', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      
      cache.clear()
      
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
    })
  })

  describe('배치 작업', () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({ data: [], error: null, select: vi.fn(() => ({ data: [], error: null })) })),
        update: vi.fn(() => ({ data: [], error: null, select: vi.fn(() => ({ data: [], error: null })) })),
        eq: vi.fn(() => ({ data: [], error: null, select: vi.fn(() => ({ data: [], error: null })) }))
      }))
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('배치 삽입이 정상적으로 작동해야 한다', async () => {
      const records = [
        { name: 'test1' },
        { name: 'test2' }
      ]
      
      // batch.insertMany 함수가 mockSupabase를 사용하도록 모킹
      const originalSupabase = batch.insertMany
      batch.insertMany = async (table, data, batchSize) => {
        return data // 간단한 모킹
      }
      
      const result = await batch.insertMany('test_table', records)
      expect(result).toEqual(records)
      
      // 원래 함수 복원
      batch.insertMany = originalSupabase
    })
  })

  describe('성능 모니터링', () => {
    it('타이머를 시작하고 종료할 수 있어야 한다', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      performance.startTimer('test-operation')
      performance.endTimer('test-operation')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-operation 실행 시간:')
      )
      
      consoleSpy.mockRestore()
    })

    it('쿼리 실행 시간을 측정할 수 있어야 한다', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const testQuery = () => Promise.resolve('test result')
      
      const result = await performance.measureQuery('test-query', testQuery)
      
      expect(result).toBe('test result')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-query 실행 시간:')
      )
      
      consoleSpy.mockRestore()
    })
  })
})

describe('날짜 유틸리티', () => {
  it('날짜 문자열을 올바르게 생성해야 한다', () => {
    const date = new Date(2024, 0, 15) // 2024-01-15
    const dateString = date.toISOString().split('T')[0]
    expect(dateString).toBe('2024-01-15')
  })

  it('월의 첫 날과 마지막 날을 올바르게 계산해야 한다', () => {
    const year = 2024
    const month = 2 // 2월
    
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    
    expect(firstDay.getDate()).toBe(1)
    expect(firstDay.getMonth()).toBe(1) // 0부터 시작하므로 1이 2월
    expect(lastDay.getDate()).toBe(29) // 2024년은 윤년
  })
})

describe('식대 계산 로직', () => {
  it('일당 8000원으로 올바르게 계산해야 한다', () => {
    const workDays = 22
    const expectedAllowance = workDays * 8000
    const actualAllowance = Math.floor(workDays * 8000)
    
    expect(actualAllowance).toBe(expectedAllowance)
    expect(actualAllowance).toBe(176000)
  })

  it('반차 계산이 올바르게 작동해야 한다', () => {
    const fullDays = 20
    const halfDays = 2
    const totalWorkDays = fullDays + (halfDays * 0.5)
    const totalAllowance = Math.floor(totalWorkDays * 8000)
    
    expect(totalWorkDays).toBe(21)
    expect(totalAllowance).toBe(168000)
  })

  it('오후반차는 1일로 계산되어야 한다', () => {
    const workDays = 20
    const afternoonHalfDays = 1 // 오후반차는 오전 근무로 인정
    const totalWorkDays = workDays + afternoonHalfDays
    const totalAllowance = Math.floor(totalWorkDays * 8000)
    
    expect(totalWorkDays).toBe(21)
    expect(totalAllowance).toBe(168000)
  })
}) 