import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calculator, Download, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

const CalculationTab = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [employees, setEmployees] = useState([])
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  // 일당 설정
  const DAILY_RATE = 8000

  // 현재 월의 첫째날과 마지막날
  const monthRange = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    return { firstDay, lastDay }
  }, [currentDate])

  // 직원 목록 조회
  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('team', { ascending: true })
        .order('name', { ascending: true })
      
      if (error) throw error
      setEmployees(data)
    } catch (error) {
      console.error('직원 목록 조회 실패:', error)
    }
  }, [])

  // 휴무 목록 조회
  const fetchHolidays = useCallback(async () => {
    try {
      const { firstDay, lastDay } = monthRange
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .gte('holiday_date', firstDay.toISOString().split('T')[0])
        .lte('holiday_date', lastDay.toISOString().split('T')[0])
      
      if (error) throw error
      setHolidays(data)
    } catch (error) {
      console.error('휴무 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [monthRange])

  // 이전/다음 월로 이동
  const navigateMonth = useCallback((direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }, [currentDate])

  // 직원별 식대 계산
  const calculateEmployeeMeal = useCallback((employee) => {
    const { firstDay, lastDay } = monthRange
    
    // 재직 중인지 확인
    const joinDate = new Date(employee.join_date)
    const leaveDate = employee.leave_date ? new Date(employee.leave_date) : null
    
    if (joinDate > lastDay || (leaveDate && leaveDate < firstDay)) {
      return { workDays: 0, afternoonHalfDays: 0, mealAmount: 0, details: [] }
    }

    const workDetails = []
    let workDays = 0
    let afternoonHalfDays = 0

    // 해당 월의 모든 날짜를 체크
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayOfWeek = d.getDay()
      
      // 재직 기간 내인지 확인
      if (d < joinDate || (leaveDate && d > leaveDate)) {
        workDetails.push({
          date: dateStr,
          day: dayOfWeek,
          status: '미재직',
          amount: 0
        })
        continue
      }

      // 일요일은 자동 휴무 (식대 없음)
      if (dayOfWeek === 0) {
        workDetails.push({
          date: dateStr,
          day: dayOfWeek,
          status: '일요일 휴무',
          amount: 0
        })
        continue
      }

      // 등록된 휴무인지 확인
      const employeeHoliday = holidays.find(h => 
        h.employee_id === employee.id && h.holiday_date === dateStr
      )

      if (employeeHoliday) {
        // 토요일인 경우 모든 반차/연차는 식대 없음
        if (dayOfWeek === 6) {
          workDetails.push({
            date: dateStr,
            day: dayOfWeek,
            status: `${employeeHoliday.holiday_type} (토요일)`,
            amount: 0
          })
        } else if (employeeHoliday.holiday_type === '오후반차' || employeeHoliday.holiday_type === '오후연차') {
          afternoonHalfDays++
          workDetails.push({
            date: dateStr,
            day: dayOfWeek,
            status: employeeHoliday.holiday_type,
            amount: DAILY_RATE
          })
        } else {
          workDetails.push({
            date: dateStr,
            day: dayOfWeek,
            status: employeeHoliday.holiday_type,
            amount: 0
          })
        }
      } else {
        workDays++
        workDetails.push({
          date: dateStr,
          day: dayOfWeek,
          status: '근무',
          amount: DAILY_RATE
        })
      }
    }

    // 총 식대 = (근무일수 + 오후반차) × 8,000원
    const mealAmount = (workDays + afternoonHalfDays) * DAILY_RATE

    return {
      workDays,
      afternoonHalfDays,
      mealAmount,
      details: workDetails
    }
  }, [monthRange, holidays])

  // 전체 직원 식대 계산
  const allCalculations = useMemo(() => {
    return employees.map(employee => ({
      employee,
      calculation: calculateEmployeeMeal(employee)
    }))
  }, [employees, calculateEmployeeMeal])

  // CSV 다운로드
  const downloadCSV = useCallback(() => {
    const headers = ['이름', '팀', '근무일수', '오후반차', '식대금액']
    const rows = allCalculations.map(({ employee, calculation }) => [
      employee.name,
      employee.team,
      calculation.workDays,
      calculation.afternoonHalfDays,
      calculation.mealAmount.toLocaleString()
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `식대계산_${currentDate.getFullYear()}년${currentDate.getMonth() + 1}월.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }, [allCalculations, currentDate])

  // 현재 월 표시 문자열
  const currentMonthString = useMemo(() => {
    return `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
  }, [currentDate])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  if (loading) {
    return <div className="text-center py-8">식대 계산 정보를 불러오는 중...</div>
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calculator className="w-6 h-6 text-teal-600" />
          <h2 className="text-xl font-bold text-gray-900">식대 계산</h2>
          <span className="ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
            일당 {DAILY_RATE.toLocaleString()}원
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={downloadCSV}
            disabled={allCalculations.length === 0}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>CSV 다운로드</span>
          </button>
        </div>
      </div>

      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="btn btn-secondary"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold">
          {currentMonthString}
        </h3>
        <button
          onClick={() => navigateMonth(1)}
          className="btn btn-secondary"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 계산 결과 테이블 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                직원 정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                근무일수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                오후반차
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                식대금액
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allCalculations.map(({ employee, calculation }) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {employee.name}
                      </div>
                      <div className="text-lg text-blue-600 font-semibold">
                        {employee.team}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {calculation.workDays}일
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {calculation.afternoonHalfDays}일
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {calculation.mealAmount.toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                합계
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {allCalculations.reduce((sum, { calculation }) => sum + calculation.workDays, 0)}일
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {allCalculations.reduce((sum, { calculation }) => sum + calculation.afternoonHalfDays, 0)}일
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {allCalculations.reduce((sum, { calculation }) => sum + calculation.mealAmount, 0).toLocaleString()}원
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default CalculationTab 