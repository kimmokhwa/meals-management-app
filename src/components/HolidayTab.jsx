import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Download, X, Lock, Unlock } from 'lucide-react'
import { supabase, HOLIDAY_TYPES, TEAMS } from '../lib/supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const HolidayTab = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [holidays, setHolidays] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' 또는 'table'
  const [newHoliday, setNewHoliday] = useState({
    employee_id: '',
    holiday_type: ''
  })
  // 드롭다운 상태 관리
  const [activeDropdown, setActiveDropdown] = useState(null) // {employeeId, date} 형태
  
  // 월별 잠금 상태 관리
  const [isCurrentMonthLocked, setIsCurrentMonthLocked] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [unlockPassword, setUnlockPassword] = useState('')
  
  // 테이블과 달력 참조
  const tableRef = useRef(null)
  const calendarRef = useRef(null)

  // 현재 월의 날짜 계산 (메모이제이션)
  const dateCalculations = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    
    // 달력 시작 날짜 (일요일부터 시작)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    // 달력 종료 날짜
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    return { firstDay, lastDay, startDate, endDate }
  }, [currentDate])

  // 현재 월 잠금 상태 확인
  useEffect(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    // const lockInfo = monthLockManager.getMonthLock(year, month)
    setIsCurrentMonthLocked(false)
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
      const { startDate, endDate } = dateCalculations
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .gte('holiday_date', startDate.toISOString().split('T')[0])
        .lte('holiday_date', endDate.toISOString().split('T')[0])
      
      if (error) throw error
      setHolidays(data)
    } catch (error) {
      console.error('휴무 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [dateCalculations])

  // 휴무 추가
  const addHoliday = useCallback(async () => {
    // 잠금된 월에서는 추가 불가
    if (isCurrentMonthLocked) {
      alert('이 월은 잠금되어 수정할 수 없습니다.')
      return
    }
    
    if (!selectedDate || !newHoliday.employee_id || !newHoliday.holiday_type) return

    try {
      const { error } = await supabase
        .from('holidays')
        .insert([{
          employee_id: newHoliday.employee_id,
          holiday_date: selectedDate.toISOString().split('T')[0],
          holiday_type: newHoliday.holiday_type
        }])
      
      if (error) throw error
      
      setNewHoliday({ employee_id: '', holiday_type: '' })
      setShowAddModal(false)
      setSelectedDate(null)
      fetchHolidays()
    } catch (error) {
      console.error('휴무 추가 실패:', error)
    }
  }, [selectedDate, newHoliday, fetchHolidays, isCurrentMonthLocked])

  // 휴무 삭제
  const deleteHoliday = useCallback(async (id) => {
    // 잠금된 월에서는 삭제 불가
    if (isCurrentMonthLocked) {
      alert('이 월은 잠금되어 수정할 수 없습니다.')
      return
    }
    
    if (!confirm('정말로 이 휴무를 삭제하시겠습니까?')) return
    
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchHolidays()
    } catch (error) {
      console.error('휴무 삭제 실패:', error)
    }
  }, [fetchHolidays, isCurrentMonthLocked])

  // 월별 잠금 토글
  const toggleMonthLock = useCallback(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    
    if (isCurrentMonthLocked) {
      // 잠금 해제 시 비밀번호 확인
      setShowUnlockModal(true)
    } else {
      // 잠금 설정
      if (confirm(`${year}년 ${month}월을 잠금하시겠습니까?\n잠금 후에는 휴무 수정이 불가능합니다.`)) {
        try {
          // monthLockManager.setMonthLock(year, month, true)
          setIsCurrentMonthLocked(true)
          alert('월별 잠금이 설정되었습니다.')
        } catch (error) {
          console.error('잠금 설정 실패:', error)
          alert('잠금 설정에 실패했습니다.')
        }
      }
    }
  }, [currentDate, isCurrentMonthLocked])

  // 잠금 해제 처리
  const handleUnlockConfirm = useCallback(() => {
    // if (!monthLockManager.checkUnlockPassword(unlockPassword)) {
    //   alert('비밀번호가 올바르지 않습니다.')
    //   return
    // }
    
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    
    try {
      // monthLockManager.setMonthLock(year, month, false)
      setIsCurrentMonthLocked(false)
      setShowUnlockModal(false)
      setUnlockPassword('')
      alert('월별 잠금이 해제되었습니다.')
    } catch (error) {
      console.error('잠금 해제 실패:', error)
      alert('잠금 해제에 실패했습니다.')
    }
  }, [currentDate, unlockPassword])

  // 잠금 해제 모달 닫기
  const handleUnlockCancel = useCallback(() => {
    setShowUnlockModal(false)
    setUnlockPassword('')
  }, [])

  // 날짜 클릭 핸들러
  const handleDateClick = useCallback((date) => {
    // 잠금된 월에서는 클릭 불가
    if (isCurrentMonthLocked) {
      alert('이 월은 잠금되어 수정할 수 없습니다.')
      return
    }
    
    setSelectedDate(date)
    setShowAddModal(true)
  }, [isCurrentMonthLocked])

  // 날짜별 휴무 조회 (메모이제이션)
  const holidaysByDate = useMemo(() => {
    const holidayMap = {}
    holidays.forEach(holiday => {
      if (!holidayMap[holiday.holiday_date]) {
        holidayMap[holiday.holiday_date] = []
      }
      holidayMap[holiday.holiday_date].push(holiday)
    })
    return holidayMap
  }, [holidays])

  // 날짜별 휴무 조회
  const getHolidaysForDate = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0]
    return holidaysByDate[dateStr] || []
  }, [holidaysByDate])

  // 요일별 스타일
  const getDayStyle = useCallback((date) => {
    const day = date.getDay()
    if (day === 6) return '' // 토요일
    return ''
  }, [])

  // 이전/다음 월로 이동
  const navigateMonth = useCallback((direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }, [currentDate])

  // 폼 핸들러들
  const handleEmployeeChange = useCallback((e) => {
    setNewHoliday(prev => ({ ...prev, employee_id: e.target.value }))
  }, [])

  const handleHolidayTypeChange = useCallback((e) => {
    setNewHoliday(prev => ({ ...prev, holiday_type: e.target.value }))
  }, [])

  const handleModalClose = useCallback(() => {
    setShowAddModal(false)
    setSelectedDate(null)
    setNewHoliday({ employee_id: '', holiday_type: '' })
  }, [])

  // 직원 이름 조회 (메모이제이션)
  const employeeMap = useMemo(() => {
    const map = {}
    employees.forEach(emp => {
      map[emp.id] = emp.name
    })
    return map
  }, [employees])

  const getEmployeeName = useCallback((employee_id) => {
    return employeeMap[employee_id] || '알 수 없음'
  }, [employeeMap])

  // 현재 월 표시 문자열
  const currentMonthString = useMemo(() => {
    return `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
  }, [currentDate])

  // 달력 날짜 배열 생성 (6x6 그리드 형태 - 일요일 제외)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const days = []
    
    // 해당 월의 1일
    const firstDay = new Date(year, month, 1, 12, 0, 0)
    // 해당 월의 1일이 무슨 요일인지 (0=일요일, 1=월요일, ...)
    const firstDayOfWeek = firstDay.getDay()
    
    // 이전 달의 마지막 날
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const lastDayOfPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()
    
    // 현재 월의 마지막 날
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    
    // 이전 달의 마지막 날들 (첫 주 채우기 - 일요일 제외)
    // 월요일부터 시작하므로 firstDayOfWeek가 0(일요일)이면 0개, 1(월요일)이면 0개, 2(화요일)이면 1개...
    const adjustedFirstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    for (let i = adjustedFirstDayOfWeek - 1; i >= 0; i--) {
      const day = lastDayOfPrevMonth - i
      const date = new Date(prevYear, prevMonth, day, 12, 0, 0)
      // 일요일 제외
      if (date.getDay() !== 0) {
        days.push(date)
      }
    }
    
    // 현재 월의 모든 날짜들 (일요일 제외)
    for (let day = 1; day <= lastDayOfMonth; day++) {
      const date = new Date(year, month, day, 12, 0, 0)
      if (date.getDay() !== 0) {
        days.push(date)
      }
    }
    
    // 다음 달의 첫 날들 (마지막 주 채우기 - 일요일 제외)
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    const targetDays = 36 // 6x6 = 36
    
    let nextDay = 1
    while (days.length < targetDays) {
      const date = new Date(nextYear, nextMonth, nextDay, 12, 0, 0)
      if (date.getDay() !== 0) {
        days.push(date)
      }
      nextDay++
    }
    
    return days
  }, [currentDate])

  // 폼 유효성 검사
  const isFormValid = useMemo(() => {
    return selectedDate && newHoliday.employee_id && newHoliday.holiday_type
  }, [selectedDate, newHoliday.employee_id, newHoliday.holiday_type])

  // 팀별 직원 그룹화 (메모이제이션)
  const employeesByTeam = useMemo(() => {
    const grouped = {}
    const teamOrder = ['의국팀', '상담팀', '코디팀', '간호팀', '피부팀', '경영지원팀']
    
    employees.forEach(employee => {
      if (!grouped[employee.team]) {
        grouped[employee.team] = []
      }
      grouped[employee.team].push(employee)
    })
    
    // 팀 순서에 따라 정렬된 객체 반환
    const orderedGrouped = {}
    teamOrder.forEach(team => {
      if (grouped[team]) {
        orderedGrouped[team] = grouped[team]
      }
    })
    
    // 정의되지 않은 팀이 있다면 뒤에 추가
    Object.keys(grouped).forEach(team => {
      if (!teamOrder.includes(team)) {
        orderedGrouped[team] = grouped[team]
      }
    })
    
    return orderedGrouped
  }, [employees])

  // 현재 월의 모든 날짜 배열 (테이블용 - 현재 월만 포함)
  const monthDates = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dates = []
    
    // 현재 월의 마지막 날 계산
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    
    // 1일부터 마지막 날까지만 포함 (정오로 설정하여 시간대 문제 방지)
    for (let day = 1; day <= lastDayOfMonth; day++) {
      dates.push(new Date(year, month, day, 12, 0, 0))
    }
    
    return dates
  }, [currentDate])

  // 팀별 휴무 일괄 추가 함수
  const addTeamHoliday = useCallback(async (team, date, holidayType) => {
    const teamEmployees = employeesByTeam[team] || []
    
    try {
      const holidayData = teamEmployees.map(employee => ({
        employee_id: employee.id,
        holiday_date: date.toISOString().split('T')[0],
        holiday_type: holidayType
      }))
      
      const { error } = await supabase
        .from('holidays')
        .insert(holidayData)
      
      if (error) throw error
      fetchHolidays()
    } catch (error) {
      console.error('팀 휴무 추가 실패:', error)
    }
  }, [employeesByTeam, fetchHolidays])

  // 드롭다운 토글
  const toggleDropdown = useCallback((dropdownKey) => {
    // 잠금된 월에서는 드롭다운 비활성화
    if (isCurrentMonthLocked) {
      alert('이 월은 잠금되어 수정할 수 없습니다.')
      return
    }
    
    setActiveDropdown(current => 
      current === dropdownKey ? null : dropdownKey
    )
  }, [isCurrentMonthLocked])

  // 드롭다운 닫기
  const closeDropdown = useCallback(() => {
    setActiveDropdown(null)
  }, [])

  // 휴무 유형 선택
  const selectHolidayType = useCallback(async (employeeId, date, holidayType) => {
    // 잠금된 월에서는 수정 불가
    if (isCurrentMonthLocked) {
      alert('이 월은 잠금되어 수정할 수 없습니다.')
      return
    }
    
    const dateStr = date.toISOString().split('T')[0]
    
    try {
      // 기존 휴무 확인
      const existingHoliday = holidays.find(h => h.employee_id === employeeId && h.holiday_date === dateStr)
      
      if (existingHoliday) {
        // 휴무 수정
        const { error } = await supabase
          .from('holidays')
          .update({ holiday_type: holidayType })
          .eq('id', existingHoliday.id)
        
        if (error) throw error
      } else {
        // 휴무 추가
        const { error } = await supabase
          .from('holidays')
          .insert([{
            employee_id: employeeId,
            holiday_date: dateStr,
            holiday_type: holidayType
          }])
        
        if (error) throw error
      }
      
      // 드롭다운 닫기
      closeDropdown()
      
      // 휴무 목록 새로고침
      fetchHolidays()
    } catch (error) {
      console.error('휴무 설정 실패:', error)
    }
  }, [holidays, closeDropdown, fetchHolidays, isCurrentMonthLocked])

  // 휴무 삭제
  const removeHoliday = useCallback(async (employeeId, date) => {
    // 잠금된 월에서는 삭제 불가
    if (isCurrentMonthLocked) {
      alert('이 월은 잠금되어 수정할 수 없습니다.')
      return
    }
    
    const dateStr = date.toISOString().split('T')[0]
    const existingHoliday = holidays.find(h => h.employee_id === employeeId && h.holiday_date === dateStr)
    
    if (!existingHoliday) return
    
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', existingHoliday.id)
      
      if (error) throw error
      
      // 드롭다운 닫기
      closeDropdown()
      
      // 휴무 목록 새로고침
      fetchHolidays()
    } catch (error) {
      console.error('휴무 삭제 실패:', error)
    }
  }, [holidays, closeDropdown, fetchHolidays, isCurrentMonthLocked])

  // 달력 다운로드 함수 (PDF)
  const downloadCalendar = useCallback(async () => {
    try {
      // 현재 뷰 모드에 따라 적절한 요소 선택
      const targetRef = viewMode === 'table' ? tableRef : calendarRef
      
      if (!targetRef.current) {
        alert('다운로드할 요소를 찾을 수 없습니다.')
        return
      }

      // 드롭다운 메뉴 닫기
      setActiveDropdown(null)
      
      // 잠시 기다려서 드롭다운이 완전히 닫힌 후 캡처
      await new Promise(resolve => setTimeout(resolve, 100))

      // 선택된 요소 캡처
      const canvas = await html2canvas(targetRef.current, {
        scale: 2, // 고해상도
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: targetRef.current.scrollWidth,
        height: targetRef.current.scrollHeight
      })

      // PDF 생성
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape', // 가로 방향
        unit: 'mm',
        format: 'a4'
      })

      // 이미지 크기 계산
      const imgWidth = 297 // A4 가로 크기 (mm)
      const pageHeight = 210 // A4 세로 크기 (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      // 첫 페이지에 이미지 추가
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // 이미지가 한 페이지보다 클 경우 페이지 추가
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // PDF 다운로드
      pdf.save(`휴무달력_${currentMonthString}.pdf`)
    } catch (error) {
      console.error('달력 다운로드 실패:', error)
      alert('달력 다운로드 중 오류가 발생했습니다.')
    }
  }, [currentMonthString, viewMode])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeDropdown && !e.target.closest('.dropdown-container')) {
        closeDropdown()
      }
    }
    
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeDropdown, closeDropdown])

  if (loading) {
    return (
      <div className="text-center py-8 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 rounded-xl text-white">
        <div className="text-2xl font-bold flex items-center justify-center gap-2">
          휴무 달력을 불러오는 중...
        </div>
        <div className="text-sm mt-2 opacity-80">
          잠깐만... 재미있는 휴무 달력을 준비하고 있어요!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-teal-600" />
          <h2 className="text-xl font-bold text-gray-900">휴무 달력</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'calendar' ? 'table' : 'calendar')}
            className="btn btn-secondary flex items-center space-x-2"
          >
            {viewMode === 'calendar' ? '표 보기' : '달력 보기'}
          </button>
          <button
            onClick={toggleMonthLock}
            className={`btn ${isCurrentMonthLocked ? 'btn-danger' : 'btn-secondary'} flex items-center space-x-2`}
          >
            {isCurrentMonthLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{isCurrentMonthLocked ? '잠금 해제' : '잠금'}</span>
          </button>
        </div>
      </div>

      {/* 달력/표 네비게이션 */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="btn btn-secondary"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold">
          {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
        </h3>
        <button
          onClick={() => navigateMonth(1)}
          className="btn btn-secondary"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="bg-white rounded-lg shadow-sm">
        {viewMode === 'calendar' ? (
          <div className="p-4" ref={calendarRef}>
            {/* 정말 달력처럼 표시 */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 p-2 text-center font-medium text-gray-900" colSpan="7">
                      {/* 월~토 요일 헤더 */}
                    </th>
                  </tr>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 p-2 text-left font-medium text-gray-900 w-24">팀</th>
                    <th className="bg-gray-50 border border-gray-200 p-2 text-center font-medium">월</th>
                    <th className="bg-gray-50 border border-gray-200 p-2 text-center font-medium">화</th>
                    <th className="bg-gray-50 border border-gray-200 p-2 text-center font-medium">수</th>
                    <th className="bg-gray-50 border border-gray-200 p-2 text-center font-medium">목</th>
                    <th className="bg-gray-50 border border-gray-200 p-2 text-center font-medium">금</th>
                    <th className="bg-gray-50 border border-gray-200 p-2 text-center font-medium text-blue-500">토</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const year = currentDate.getFullYear()
                    const month = currentDate.getMonth()
                    const firstDay = new Date(year, month, 1)
                    const lastDay = new Date(year, month + 1, 0)
                    
                    // 1일의 요일 확인 (0=일, 1=월, ..., 6=토)
                    let firstDayOfWeek = firstDay.getDay()
                    // 일요일이면 다음날(월요일)부터 시작
                    if (firstDayOfWeek === 0) {
                      firstDayOfWeek = 1
                    }
                    
                    // 달력 배열 생성
                    const calendarDays = []
                    let dayCounter = 1
                    
                    // 주차별로 달력 생성
                    while (dayCounter <= lastDay.getDate()) {
                      const week = []
                      
                      // 월~토 (1~6)
                      for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
                        if (dayCounter === 1 && dayOfWeek < firstDayOfWeek) {
                          // 첫 주의 빈 날짜
                          week.push(null)
                        } else if (dayCounter > lastDay.getDate()) {
                          // 마지막 주의 빈 날짜
                          week.push(null)
                        } else {
                          // 실제 날짜
                          const date = new Date(year, month, dayCounter)
                          if (date.getDay() !== 0) { // 일요일 제외
                            week.push(date)
                            dayCounter++
                          } else {
                            // 일요일은 건너뛰고 다음 날로
                            dayCounter++
                            if (dayCounter <= lastDay.getDate()) {
                              week.push(new Date(year, month, dayCounter))
                              dayCounter++
                            } else {
                              week.push(null)
                            }
                          }
                        }
                      }
                      
                      calendarDays.push(week)
                    }
                    
                    // 팀별 색상 설정
                    const teamColors = {
                      '의국팀': 'bg-yellow-50 border-l-4 border-yellow-400',
                      '상담팀': 'bg-green-50 border-l-4 border-green-400',
                      '코디팀': 'bg-blue-50 border-l-4 border-blue-400',
                      '간호팀': 'bg-orange-50 border-l-4 border-orange-400',
                      '피부팀': 'bg-red-50 border-l-4 border-red-400',
                      '경영지원팀': 'bg-gray-50 border-l-4 border-gray-400'
                    }
                    
                    return calendarDays.map((week, weekIndex) => (
                      <React.Fragment key={weekIndex}>
                        {/* 날짜 행 */}
                        <tr>
                          <td className="bg-gray-100 border border-gray-200 p-1 text-center font-medium text-sm">
                            {weekIndex + 1}주
                          </td>
                          {week.map((date, dayIndex) => (
                            <td key={dayIndex} className="bg-gray-100 border border-gray-200 p-1 text-center font-medium text-sm">
                              {date ? date.getDate() : ''}
                            </td>
                          ))}
                        </tr>
                        {/* 팀별 행 */}
                        {TEAMS.map((team) => (
                          <tr key={`${weekIndex}-${team}`}>
                            <td className={`border border-gray-200 p-2 font-medium ${teamColors[team]}`}>
                              {team}
                            </td>
                            {week.map((date, dayIndex) => {
                              if (!date) {
                                return <td key={dayIndex} className="border border-gray-200 p-1 bg-gray-50"></td>
                              }
                              
                              const holidaysForDate = getHolidaysForDate(date)
                              const teamHolidays = holidaysForDate.filter(h => {
                                const employee = employees.find(e => e.id === h.employee_id)
                                return employee?.team === team
                              })
                              
                              return (
                                <td 
                                  key={dayIndex}
                                  className={`border border-gray-200 p-1 text-xs ${teamColors[team].replace('border-l-4', '')} cursor-pointer hover:bg-opacity-75`}
                                  onClick={() => handleDateClick(date)}
                                >
                                  {teamHolidays.length > 0 ? (
                                    <div className="space-y-0.5">
                                      {teamHolidays.slice(0, 3).map((holiday) => {
                                        const employee = employees.find(e => e.id === holiday.employee_id)
                                        return (
                                          <div key={holiday.id} className="flex items-center justify-between">
                                            <span className="truncate">
                                              {employee?.name}({getHolidayTypeAbbr(holiday.holiday_type)})
                                            </span>
                                            {!isCurrentMonthLocked && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  deleteHoliday(holiday.id)
                                                }}
                                                className="ml-1 text-gray-400 hover:text-red-600 flex-shrink-0"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-center text-gray-400">-</div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {/* 표 뷰 */}
            <table className="table">
              <thead>
                <tr>
                  <th>팀</th>
                  <th>이름</th>
                  {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => (
                    <th key={i} className="text-center w-8">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id} className="border-t border-gray-200">
                    <td className="font-medium">{employee.team}</td>
                    <td className="font-medium">{employee.name}</td>
                    {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => {
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
                      const holidays = getHolidaysForDate(date)
                      const employeeHoliday = holidays.find(h => h.employee_id === employee.id)

                      return (
                        <td key={i} className="text-center">
                          {employeeHoliday && (
                            <div className={`text-xs p-1 rounded ${getHolidayColor(employeeHoliday.holiday_type)}`}>
                              {getHolidayShortText(employeeHoliday.holiday_type)}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 휴무 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                휴무 추가 - {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  직원
                </label>
                <select
                  value={newHoliday.employee_id}
                  onChange={handleEmployeeChange}
                  className="select"
                >
                  <option value="">직원 선택</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.team})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  휴무 유형
                </label>
                <select
                  value={newHoliday.holiday_type}
                  onChange={handleHolidayTypeChange}
                  className="select"
                >
                  <option value="">휴무 유형 선택</option>
                  {HOLIDAY_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary"
              >
                취소
              </button>
              <button
                onClick={addHoliday}
                disabled={!newHoliday.employee_id || !newHoliday.holiday_type}
                className="btn btn-primary"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 잠금 해제 모달 */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">잠금 해제</h3>
              <button
                onClick={handleUnlockCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  className="input"
                  placeholder="비밀번호를 입력하세요"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleUnlockCancel}
                className="btn btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleUnlockConfirm}
                disabled={!unlockPassword}
                className="btn btn-primary"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 휴무 색상 함수
const getHolidayColor = (holidayType) => {
  const colors = {
    '휴무': 'bg-red-100 text-red-800',
    '연차': 'bg-blue-100 text-blue-800',
    '오전반차': 'bg-yellow-100 text-yellow-800',
    '오후반차': 'bg-orange-100 text-orange-800',
    '오전+오후반차': 'bg-purple-100 text-purple-800',
    '병가': 'bg-pink-100 text-pink-800',
    '결근': 'bg-gray-100 text-gray-800'
  }
  return colors[holidayType] || 'bg-gray-100 text-gray-800'
}

// 휴무 타입 약어 변환
const getHolidayTypeAbbr = (holidayType) => {
  const abbrs = {
    '휴무': '휴',
    '연차': '연',
    '오전반차': '오전',
    '오후반차': '오후',
    '오전+오후반차': '전',
    '병가': '병',
    '결근': '결'
  }
  return abbrs[holidayType] || holidayType
}

// 해당 월의 일수 구하기
const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

// 휴무 축약 텍스트 함수
const getHolidayShortText = (holidayType) => {
  const shortTexts = {
    '휴무': '휴',
    '연차': '연',
    '오전반차': '오전',
    '오후반차': '오후',
    '오전+오후반차': '전',
    '병가': '병',
    '결근': '결'
  }
  return shortTexts[holidayType] || '?'
}

export default HolidayTab 