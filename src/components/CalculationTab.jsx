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
      return { workDays: 0, holidayDays: 0, mealAmount: 0, details: [] }
    }

    const workDetails = []
    let workDays = 0
    let holidayDays = 0

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
        holidayDays++
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
        holidayDays++
        const amount = getHolidayMealAmount(employeeHoliday.holiday_type)
        workDetails.push({
          date: dateStr,
          day: dayOfWeek,
          status: employeeHoliday.holiday_type,
          amount: amount
        })
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

    const mealAmount = workDetails.reduce((sum, detail) => sum + detail.amount, 0)

    return {
      workDays,
      holidayDays,
      mealAmount,
      details: workDetails
    }
  }, [monthRange, holidays])

  // 휴무 유형별 식대 계산
  const getHolidayMealAmount = useCallback((holidayType) => {
    switch (holidayType) {
      case '오후반차':
        return DAILY_RATE // 오후반차만 식대 지급
      case '연차':
      case '휴무':
      case '오전반차':
      case '오전+오후반차':
      case '병가':
      case '결근':
      default:
        return 0 // 나머지는 모두 식대 없음
    }
  }, [])

  // 전체 직원 식대 계산
  const allCalculations = useMemo(() => {
    return employees.map(employee => ({
      employee,
      calculation: calculateEmployeeMeal(employee)
    }))
  }, [employees, calculateEmployeeMeal])

  // CSV 다운로드
  const downloadCSV = useCallback(() => {
    const headers = ['이름', '팀', '근무일수', '휴무일수', '식대금액']
    const rows = allCalculations.map(({ employee, calculation }) => [
      employee.name,
      employee.team,
      calculation.workDays,
      calculation.holidayDays,
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

      {/* 팀별 직원 목록 */}
      <div className="space-y-6">
        {Object.entries(
          allCalculations.reduce((acc, { employee, calculation }) => {
            if (!acc[employee.team]) acc[employee.team] = []
            acc[employee.team].push({ employee, calculation })
            return acc
          }, {})
        ).map(([team, teamCalculations]) => (
          <div key={team} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">{team}</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {teamCalculations.map(({ employee, calculation }) => (
                <div
                  key={employee.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEmployee(
                    selectedEmployee?.id === employee.id ? null : { ...employee, calculation }
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <h5 className="font-medium text-gray-900">{employee.name}</h5>
                        <p className="text-sm text-gray-500">
                          근무 {calculation.workDays}일 · 휴무 {calculation.holidayDays}일
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {calculation.mealAmount.toLocaleString()}원
                      </div>
                      <div className="text-sm text-gray-500">
                        {calculation.workDays * DAILY_RATE === calculation.mealAmount
                          ? '정상 지급'
                          : '일부 차감'
                        }
                      </div>
                    </div>
                  </div>

                  {/* 상세 정보 */}
                  {selectedEmployee?.id === employee.id && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">요일</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">식대</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {calculation.details.map((detail, index) => (
                              <tr key={detail.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                                  {detail.date}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                                  {['일', '월', '화', '수', '목', '금', '토'][detail.day]}
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    detail.status === '근무' ? 'bg-green-100 text-green-800' :
                                    detail.status === '미재직' ? 'bg-gray-100 text-gray-800' :
                                    detail.status === '일요일 휴무' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {detail.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right whitespace-nowrap">
                                  {detail.amount.toLocaleString()}원
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan="3" className="px-4 py-2 text-sm font-medium text-gray-900">
                                합계
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                                {calculation.mealAmount.toLocaleString()}원
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CalculationTab 