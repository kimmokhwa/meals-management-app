/**
 * 식대 계산 유틸리티 함수들
 */

// 일일 식대 지급액 (8,000원)
export const DAILY_ALLOWANCE = 8000

/**
 * 직원의 월별 근무일 계산
 * @param {Object} employee - 직원 정보
 * @param {Array} holidays - 휴무 정보 배열
 * @param {number} year - 연도
 * @param {number} month - 월
 * @returns {Object} 근무일 계산 결과
 */
export const calculateWorkDays = (employee, holidays, year, month) => {
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
      // 토요일인 경우 모든 반차/연차는 식대 없음
      if (dayOfWeek === 6) {
        offDays++
      } else if (dayHoliday.holiday_type === '오후반차' || dayHoliday.holiday_type === '오후연차') {
        // 평일 오후반차, 오후연차는 오전 근무 인정 (식대 있음)
        workDays++
        halfDays++
      } else if (
        dayHoliday.holiday_type === '오전반차' ||
        dayHoliday.holiday_type === '오전연차' ||
        dayHoliday.holiday_type === '오전+오후반차'
      ) {
        // 오전반차, 오전연차, 오전+오후반차는 근무일 0, 식대 0
        offDays++
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

/**
 * 팀별 집계 계산
 * @param {Array} calculations - 개별 계산 결과 배열
 * @returns {Array} 팀별 집계 결과 배열
 */
export const calculateTeamSummary = (calculations) => {
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