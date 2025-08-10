import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Plus, Upload, Download, Edit2, Trash2, Users } from 'lucide-react'
import { supabase, TEAMS } from '../lib/supabase'

const EmployeeTab = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    team: '',
    join_date: '',
    leave_date: ''
  })
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    team: '',
    join_date: '',
    leave_date: ''
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [notification, setNotification] = useState(null)

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
    } finally {
      setLoading(false)
    }
  }, [])

  // 알림 표시 함수
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // 편집 시작 시 폼 초기화
  useEffect(() => {
    if (editingEmployee) {
      setEditForm({
        name: editingEmployee.name || '',
        team: editingEmployee.team || '',
        join_date: editingEmployee.join_date || '',
        leave_date: editingEmployee.leave_date || ''
      })
    }
  }, [editingEmployee])

  // 직원 추가
  const addEmployee = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          // id를 제거하여 Supabase가 자동으로 UUID를 생성하도록 함
          name: newEmployee.name,
          team: newEmployee.team,
          join_date: newEmployee.join_date,
          leave_date: newEmployee.leave_date || null
        }])
        .select()
      
      if (error) throw error
      
      setNewEmployee({ name: '', team: '', join_date: '', leave_date: '' })
      setShowAddForm(false)
      fetchEmployees()
      showNotification('직원이 성공적으로 추가되었습니다.')
    } catch (error) {
      console.error('직원 추가 실패:', error)
      console.error('에러 상세:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      showNotification(`직원 추가 실패: ${error.message}`, 'error')
    }
  }, [newEmployee, fetchEmployees, showNotification])

  // 직원 삭제
  const deleteEmployee = useCallback(async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchEmployees()
      showNotification('직원이 성공적으로 삭제되었습니다.')
    } catch (error) {
      console.error('직원 삭제 실패:', error)
      showNotification(error.message, 'error')
    }
  }, [fetchEmployees, showNotification])

  // 직원 정보 업데이트
  const updateEmployee = useCallback(async () => {
    if (!editingEmployee) return
    try {
      const updatePayload = {
        name: editForm.name,
        team: editForm.team,
        join_date: editForm.join_date,
        leave_date: editForm.leave_date ? editForm.leave_date : null
      }

      const { error } = await supabase
        .from('employees')
        .update(updatePayload)
        .eq('id', editingEmployee.id)

      if (error) throw error

      setEditingEmployee(null)
      await fetchEmployees()
      showNotification('직원 정보가 업데이트되었습니다.')
    } catch (error) {
      console.error('직원 정보 업데이트 실패:', error)
      showNotification(`업데이트 실패: ${error.message}`, 'error')
    }
  }, [editingEmployee, editForm, fetchEmployees, showNotification])

  // 편집 폼 변경 핸들러
  const handleEditFieldChange = useCallback((field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }, [])

  // CSV 파일 다운로드
  const downloadCSV = useCallback(() => {
    const headers = ['이름', '팀', '입사일', '퇴사일']
    const rows = employees.map(emp => [
      emp.name,
      emp.team,
      emp.join_date,
      emp.leave_date || ''
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `직원목록_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }, [employees])

  // CSV 파일 업로드
  const handleCSVUpload = useCallback(async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      // 헤더 제거
      const dataLines = lines.slice(1)
      
      const newEmployees = dataLines.map((line, index) => {
        const [name, team, join_date, leave_date] = line.split(',').map(field => 
          field.replace(/^"|"$/g, '').trim()
        )
        
        return {
          // id를 제거하여 Supabase가 자동으로 UUID를 생성하도록 함
          name,
          team,
          join_date,
          leave_date: leave_date || null
        }
      }).filter(emp => emp.name && emp.team && emp.join_date && TEAMS.includes(emp.team))

      if (newEmployees.length === 0) {
        alert('유효한 직원 데이터가 없습니다. CSV 형식을 확인해주세요.')
        return
      }

      // 데이터베이스에 삽입
      const { data: insertedEmployees, error } = await supabase
        .from('employees')
        .insert(newEmployees)
        .select()
      
      if (error) throw error
      
      console.log('CSV로 추가된 직원들:', insertedEmployees)
      
      alert(`${newEmployees.length}명의 직원이 성공적으로 추가되었습니다.`)
      fetchEmployees()
    } catch (error) {
      console.error('CSV 업로드 실패:', error)
      alert('CSV 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [fetchEmployees])

  // 팀별 직원 그룹핑 (메모이제이션)
  const groupedEmployees = useMemo(() => {
    return employees.reduce((acc, employee) => {
      if (!acc[employee.team]) {
        acc[employee.team] = []
      }
      acc[employee.team].push(employee)
      return acc
    }, {})
  }, [employees])

  // 폼 상태 업데이트 핸들러들
  const handleNameChange = useCallback((e) => {
    setNewEmployee(prev => ({ ...prev, name: e.target.value }))
  }, [])

  const handleTeamChange = useCallback((e) => {
    setNewEmployee(prev => ({ ...prev, team: e.target.value }))
  }, [])

  const handleJoinDateChange = useCallback((e) => {
    setNewEmployee(prev => ({ ...prev, join_date: e.target.value }))
  }, [])

  const handleLeaveDateChange = useCallback((e) => {
    setNewEmployee(prev => ({ ...prev, leave_date: e.target.value }))
  }, [])

  // 폼 제출 핸들러
  const handleFormSubmit = useCallback((e) => {
    e.preventDefault()
    addEmployee()
  }, [addEmployee])

  // 폼 취소 핸들러
  const handleFormCancel = useCallback(() => {
    setShowAddForm(false)
  }, [])

  // 직원 추가 버튼 핸들러
  const handleShowAddForm = useCallback(() => {
    setShowAddForm(true)
  }, [])

  // CSV 업로드 버튼 핸들러
  const handleCSVUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // 폼 유효성 검사
  const isFormValid = useMemo(() => {
    return newEmployee.name && newEmployee.team && newEmployee.join_date
  }, [newEmployee.name, newEmployee.team, newEmployee.join_date])

  // 직원 수 계산
  const totalEmployees = useMemo(() => employees.length, [employees.length])

  // 팀별 배경색과 보더색 반환
  const getTeamBackgroundColor = useCallback((teamName) => {
    const teamColors = {
      '의국팀': 'bg-yellow-100',
      '상담팀': 'bg-red-100', 
      '코디팀': 'bg-green-100',
      '간호팀': 'bg-blue-100',
      '피부팀': 'bg-cyan-100',
      '경영지원팀': 'bg-orange-100'
    }
    return teamColors[teamName] || 'bg-gray-100'
  }, [])

  const getTeamBorderColor = useCallback((teamName) => {
    const teamBorderColors = {
      '의국팀': 'border-l-yellow-400',
      '상담팀': 'border-l-red-400', 
      '코디팀': 'border-l-green-400',
      '간호팀': 'border-l-blue-400',
      '피부팀': 'border-l-cyan-400',
      '경영지원팀': 'border-l-orange-400'
    }
    return teamBorderColors[teamName] || 'border-l-gray-400'
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  if (loading) {
    return <div className="text-center py-8">직원 목록을 불러오는 중...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 알림 메시지 */}
      {notification && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
            notification.type === 'error' 
              ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-green-100 text-green-700 border border-green-200'
          } transition-opacity duration-300`}
        >
          {notification.message}
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            직원 관리
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShowAddForm}
              className="inline-flex items-center px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              직원 추가
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 bg-[#10B981] text-white rounded-lg hover:bg-green-700 transition-colors"
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? '업로드 중...' : 'CSV 업로드'}
            </button>
            <button
              onClick={downloadCSV}
              className="inline-flex items-center px-4 py-2 bg-[#6B7280] text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV 다운로드
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCSVUpload}
              accept=".csv"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* 직원 추가 폼 */}
      {showAddForm && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={handleNameChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  팀
                </label>
                <select
                  value={newEmployee.team}
                  onChange={handleTeamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                  required
                >
                  <option value="">팀 선택</option>
                  {TEAMS.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  입사일
                </label>
                <input
                  type="date"
                  value={newEmployee.join_date}
                  onChange={handleJoinDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  퇴사일
                </label>
                <input
                  type="date"
                  value={newEmployee.leave_date}
                  onChange={handleLeaveDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleFormCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 팀별 직원 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TEAMS.map(team => (
            <TeamSection
              key={team}
              team={team}
              employees={groupedEmployees[team] || []}
              onEditEmployee={setEditingEmployee}
              onDeleteEmployee={deleteEmployee}
              getTeamBackgroundColor={(team) => {
                switch (team) {
                  case '의국팀': return 'bg-[#FEF3C7]'
                  case '상담팀': return 'bg-[#D1FAE5]'
                  case '코디팀': return 'bg-[#CFFAFE]'
                  case '간호팀': return 'bg-[#FED7AA]'
                  case '피부팀': return 'bg-[#FECACA]'
                  case '경영지원팀': return 'bg-[#FECDD3]'
                  default: return 'bg-gray-50'
                }
              }}
              getTeamBorderColor={(team) => {
                switch (team) {
                  case '의국팀': return 'border-[#F59E0B]'
                  case '상담팀': return 'border-[#10B981]'
                  case '코디팀': return 'border-[#3B82F6]'
                  case '간호팀': return 'border-[#F59E0B]'
                  case '피부팀': return 'border-[#EF4444]'
                  case '경영지원팀': return 'border-[#6B7280]'
                  default: return 'border-gray-200'
                }
              }}
            />
          ))}
        </div>
      )}

      {/* 직원 편집 모달 */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">직원 정보 수정</h3>
              <p className="text-sm text-gray-500 mt-1">퇴사일을 포함해 직원 정보를 수정할 수 있습니다.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => handleEditFieldChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">팀</label>
                <select
                  value={editForm.team}
                  onChange={(e) => handleEditFieldChange('team', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                >
                  <option value="">팀 선택</option>
                  {TEAMS.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">입사일</label>
                <input
                  type="date"
                  value={editForm.join_date}
                  onChange={(e) => handleEditFieldChange('join_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">퇴사일</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={editForm.leave_date || ''}
                    onChange={(e) => handleEditFieldChange('leave_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditFieldChange('leave_date', new Date().toISOString().split('T')[0])}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    오늘로 설정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditFieldChange('leave_date', '')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    퇴사일 제거
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={updateEmployee}
                className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TeamSection = ({ team, employees, onEditEmployee, onDeleteEmployee, getTeamBackgroundColor, getTeamBorderColor }) => {
  return (
    <div className={`p-6 rounded-xl border ${getTeamBorderColor(team)} ${getTeamBackgroundColor(team)}`}>
      <h2 className="text-4xl font-semibold text-blue-600 mb-4">{team} ({employees.length}명)</h2>
      <div className="grid gap-4">
        {employees.map(employee => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            onEdit={onEditEmployee}
            onDelete={onDeleteEmployee}
          />
        ))}
      </div>
    </div>
  )
}

const EmployeeCard = ({ employee, onEdit, onDelete }) => {
  const isFormer = employee.leave_date && new Date(employee.leave_date) <= new Date()
  
  return (
    <div className={`bg-white p-4 rounded-lg border ${isFormer ? 'border-gray-200 opacity-75' : 'border-gray-200'} shadow-sm`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{employee.name}</h3>
          <div className="mt-1 text-sm text-gray-500">
            <p>입사일: {employee.join_date}</p>
            {employee.leave_date && (
              <p>퇴사일: {employee.leave_date}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(employee)}
            className="p-1 text-gray-500 hover:text-[#3B82F6] transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(employee.id)}
            className="p-1 text-gray-500 hover:text-[#EF4444] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmployeeTab 