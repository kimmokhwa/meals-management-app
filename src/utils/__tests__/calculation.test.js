import { describe, it, expect } from 'vitest'

// 식대 계산 유틸리티 함수들
const DAILY_ALLOWANCE = 8000

const calculateWorkDays = (employee, holidays, year, month) => {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  const totalDays = endDate.getDate()
  
  const joinDate = new Date(employee.join_date)
  const leaveDate = employee.leave_date ? new Date(employee.leave_date) : null
  
  let workDays = 0
  let offDays = 0
  let halfDays = 0
  let sundays = 0
  
  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(year, month - 1, day)
    const dayOfWeek = currentDate.getDay()
    
    // 재직 기간 확인
    if (currentDate < joinDate || (leaveDate && currentDate > leaveDate)) {
      continue
    }
    
    // 일요일 체크
    if (dayOfWeek === 0) {
      sundays++
      continue
    }
    
    // 휴무 체크
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayHoliday = holidays.find(h => 
      h.employee_id === employee.id && h.holiday_date === dateStr
    )
    
    if (dayHoliday) {
      if (dayHoliday.holiday_type === '오후반차') {
        // 오후반차는 오전 근무 인정
        workDays++
        halfDays++
      } else if (dayHoliday.holiday_type.includes('반차')) {
        // 기타 반차는 0.5일 근무
        workDays += 0.5
        halfDays++
      } else {
        // 완전 휴무
        offDays++
      }
    } else {
      // 정상 근무
      workDays++
    }
  }
  
  return {
    total_days: totalDays,
    work_days: workDays,
    off_days: offDays,
    half_days: halfDays,
    sundays: sundays,
    total_allowance: Math.floor(workDays * DAILY_ALLOWANCE)
  }
}

const calculateTeamSummary = (calculations) => {
  const teamSummary = {}
  
  calculations.forEach(calc => {
    if (!teamSummary[calc.team]) {
      teamSummary[calc.team] = {
        team: calc.team,
        employee_count: 0,
        total_work_days: 0,
        total_allowance: 0,
        employees: []
      }
    }
    
    teamSummary[calc.team].employee_count++
    teamSummary[calc.team].total_work_days += calc.work_days
    teamSummary[calc.team].total_allowance += calc.total_allowance
    teamSummary[calc.team].employees.push(calc)
  })
  
  return Object.values(teamSummary)
}

describe('식대 계산 로직', () => {
  const mockEmployee = {
    id: 'emp1',
    name: '김철수',
    team: '의국팀',
    join_date: '2023-01-01',
    leave_date: null
  }

  describe('근무일 계산', () => {
    it('정상 근무일만 있는 경우 올바르게 계산되어야 한다', () => {
      const holidays = []
      const result = calculateWorkDays(mockEmployee, holidays, 2024, 1) // 2024년 1월
      
      // 2024년 1월은 31일, 일요일은 7, 14, 21, 28일 (4일)
      // 근무일 = 31 - 4 = 27일
      expect(result.total_days).toBe(31)
      expect(result.sundays).toBe(4)
      expect(result.work_days).toBe(27)
      expect(result.off_days).toBe(0)
      expect(result.half_days).toBe(0)
      expect(result.total_allowance).toBe(27 * 8000)
    })

    it('연차가 있는 경우 올바르게 계산되어야 한다', () => {
      const holidays = [
        { employee_id: 'emp1', holiday_date: '2024-01-15', holiday_type: '연차' },
        { employee_id: 'emp1', holiday_date: '2024-01-16', holiday_type: '연차' }
      ]
      const result = calculateWorkDays(mockEmployee, holidays, 2024, 1)
      
      expect(result.work_days).toBe(25) // 27 - 2
      expect(result.off_days).toBe(2)
      expect(result.total_allowance).toBe(25 * 8000)
    })

    it('오전반차가 있는 경우 올바르게 계산되어야 한다', () => {
      const holidays = [
        { employee_id: 'emp1', holiday_date: '2024-01-15', holiday_type: '오전반차' }
      ]
      const result = calculateWorkDays(mockEmployee, holidays, 2024, 1)
      
      expect(result.work_days).toBe(26.5) // 27 - 0.5
      expect(result.half_days).toBe(1)
      expect(result.total_allowance).toBe(Math.floor(26.5 * 8000))
    })

    it('오후반차가 있는 경우 올바르게 계산되어야 한다', () => {
      const holidays = [
        { employee_id: 'emp1', holiday_date: '2024-01-15', holiday_type: '오후반차' }
      ]
      const result = calculateWorkDays(mockEmployee, holidays, 2024, 1)
      
      // 오후반차는 오전 근무로 인정하므로 1일로 계산
      expect(result.work_days).toBe(27)
      expect(result.half_days).toBe(1)
      expect(result.total_allowance).toBe(27 * 8000)
    })

    it('월 중간 입사자의 경우 올바르게 계산되어야 한다', () => {
      const midMonthEmployee = {
        ...mockEmployee,
        join_date: '2024-01-15' // 15일 입사
      }
      const holidays = []
      const result = calculateWorkDays(midMonthEmployee, holidays, 2024, 1)
      
      // 15일부터 31일까지, 일요일 제외 (21, 28일)
      // 근무일 계산: 15~31일 중 일요일 2일 제외
      const workingDaysFrom15th = 17 - 2 // 15일부터 31일까지 17일, 일요일 2일 제외
      expect(result.work_days).toBe(workingDaysFrom15th)
    })

    it('월 중간 퇴사자의 경우 올바르게 계산되어야 한다', () => {
      const midMonthLeaver = {
        ...mockEmployee,
        leave_date: '2024-01-15' // 15일 퇴사
      }
      const holidays = []
      const result = calculateWorkDays(midMonthLeaver, holidays, 2024, 1)
      
      // 1일부터 15일까지, 일요일 제외 (7, 14일)
      const workingDaysUntil15th = 15 - 2 // 1일부터 15일까지 15일, 일요일 2일 제외
      expect(result.work_days).toBe(workingDaysUntil15th)
    })

    it('복합 휴무 유형이 있는 경우 올바르게 계산되어야 한다', () => {
      const holidays = [
        { employee_id: 'emp1', holiday_date: '2024-01-15', holiday_type: '연차' },
        { employee_id: 'emp1', holiday_date: '2024-01-16', holiday_type: '오전반차' },
        { employee_id: 'emp1', holiday_date: '2024-01-17', holiday_type: '오후반차' },
        { employee_id: 'emp1', holiday_date: '2024-01-18', holiday_type: '병가' }
      ]
      const result = calculateWorkDays(mockEmployee, holidays, 2024, 1)
      
      // 연차 1일, 오전반차 0.5일, 오후반차 1일(오전 근무), 병가 1일
      // 근무일 = 27 - 1 - 0.5 + 1 - 1 = 25.5일
      expect(result.work_days).toBe(25.5)
      expect(result.off_days).toBe(2) // 연차 + 병가
      expect(result.half_days).toBe(2) // 오전반차 + 오후반차
    })
  })

  describe('팀별 집계', () => {
    it('팀별 요약이 올바르게 계산되어야 한다', () => {
      const calculations = [
        {
          employee_id: 'emp1',
          employee_name: '김철수',
          team: '의국팀',
          work_days: 22,
          total_allowance: 176000
        },
        {
          employee_id: 'emp2',
          employee_name: '이영희',
          team: '의국팀',
          work_days: 20,
          total_allowance: 160000
        },
        {
          employee_id: 'emp3',
          employee_name: '박민수',
          team: '상담팀',
          work_days: 25,
          total_allowance: 200000
        }
      ]
      
      const teamSummary = calculateTeamSummary(calculations)
      
      expect(teamSummary).toHaveLength(2)
      
      const medicalTeam = teamSummary.find(t => t.team === '의국팀')
      expect(medicalTeam.employee_count).toBe(2)
      expect(medicalTeam.total_work_days).toBe(42)
      expect(medicalTeam.total_allowance).toBe(336000)
      
      const consultTeam = teamSummary.find(t => t.team === '상담팀')
      expect(consultTeam.employee_count).toBe(1)
      expect(consultTeam.total_work_days).toBe(25)
      expect(consultTeam.total_allowance).toBe(200000)
    })
  })

  describe('경계값 테스트', () => {
    it('2월 윤년 계산이 올바르게 작동해야 한다', () => {
      const holidays = []
      const result2024 = calculateWorkDays(mockEmployee, holidays, 2024, 2) // 윤년
      const result2023 = calculateWorkDays(mockEmployee, holidays, 2023, 2) // 평년
      
      expect(result2024.total_days).toBe(29) // 윤년 2월
      expect(result2023.total_days).toBe(28) // 평년 2월
    })

    it('근무일이 0인 경우에도 정상 처리되어야 한다', () => {
      const newEmployee = {
        ...mockEmployee,
        join_date: '2024-02-01', // 2월에만 근무
      }
      const holidays = []
      const result = calculateWorkDays(newEmployee, holidays, 2024, 1) // 1월 계산
      
      expect(result.work_days).toBe(0)
      expect(result.total_allowance).toBe(0)
    })

    it('모든 날이 휴무인 경우에도 정상 처리되어야 한다', () => {
      const holidays = []
      // 1월의 모든 평일에 휴무 추가
      for (let day = 1; day <= 31; day++) {
        const date = new Date(2024, 0, day)
        if (date.getDay() !== 0) { // 일요일이 아닌 경우
          holidays.push({
            employee_id: 'emp1',
            holiday_date: `2024-01-${day.toString().padStart(2, '0')}`,
            holiday_type: '연차'
          })
        }
      }
      
      const result = calculateWorkDays(mockEmployee, holidays, 2024, 1)
      
      expect(result.work_days).toBe(0)
      expect(result.off_days).toBe(27) // 모든 평일
      expect(result.total_allowance).toBe(0)
    })
  })
}) 