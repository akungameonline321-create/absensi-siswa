import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach Bearer token
api.interceptors.request.use(
  (config) => {
    const raw = localStorage.getItem('auth-storage')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        const token = parsed?.state?.token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch {
        // ignore parse errors
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor — redirect to /login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// ==================== Auth ====================

export const login = async ({ email, password }) => {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export const getProfile = async () => {
  const { data } = await api.get('/auth/me')
  return data
}

export const registerUser = async (userData) => {
  const { data } = await api.post('/auth/register', userData)
  return data
}

// ==================== Users ====================

export const getUsers = async (role) => {
  const params = role ? { role } : {}
  const { data } = await api.get('/users', { params })
  return data
}

// ==================== Students ====================

export const getStudents = async (kelasId) => {
  const params = kelasId ? { kelas_id: kelasId } : {}
  const { data } = await api.get('/students', { params })
  return data
}

export const getStudent = async (id) => {
  const { data } = await api.get(`/students/${id}`)
  return data
}

export const createStudent = async (studentData) => {
  const { data } = await api.post('/students', studentData)
  return data
}

export const updateStudent = async (id, studentData) => {
  const { data } = await api.put(`/students/${id}`, studentData)
  return data
}

export const deleteStudent = async (id) => {
  const { data } = await api.delete(`/students/${id}`)
  return data
}

export const importStudents = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const exportStudents = async () => {
  const response = await api.get('/students/export', { responseType: 'blob' })
  return response.data
}

export const downloadStudentTemplate = async () => {
  const response = await api.get('/students/template', { responseType: 'blob' })
  return response.data
}

// ==================== Face Update ====================

export const requestFaceUpdate = async (file) => {
  const formData = new FormData()
  formData.append('photo', file)
  const { data } = await api.post('/students/request-face-update', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const getFaceUpdates = async () => {
  const { data } = await api.get('/students/face-updates')
  return data
}

export const approveFaceUpdate = async (id, status) => {
  const { data } = await api.post(`/students/approve-face-update/${id}`, { status })
  return data
}

// ==================== Classes ====================

export const getClasses = async (tahunAjaran) => {
  const params = tahunAjaran ? { tahun_ajaran: tahunAjaran } : {}
  const { data } = await api.get('/classes', { params })
  return data
}

export const getMyClasses = async () => {
  const { data } = await api.get('/classes/my')
  return data
}

export const getClass = async (id) => {
  const { data } = await api.get(`/classes/${id}`)
  return data
}

export const createClass = async (classData) => {
  const { data } = await api.post('/classes', classData)
  return data
}

export const updateClass = async (id, classData) => {
  const { data } = await api.put(`/classes/${id}`, classData)
  return data
}

export const updateBatasWaktuHadir = async (id, batas_waktu_hadir) => {
  const { data } = await api.put(`/classes/${id}/batas-waktu`, { batas_waktu_hadir })
  return data
}

export const deleteClass = async (id) => {
  const { data } = await api.delete(`/classes/${id}`)
  return data
}

// ==================== Attendance ====================

export const getAttendanceToday = async (classId) => {
  const { data } = await api.get(`/attendance/today/${classId}`)
  return data
}

export const getAttendanceHistory = async (classId, tanggal) => {
  const params = tanggal ? { tanggal } : {}
  const { data } = await api.get(`/attendance/history/${classId}`, { params })
  return data
}

export const getAttendanceStudent = (studentId, limit = 30) => api.get(`/attendance/student/${studentId}?limit=${limit}`);
export const deleteAttendance = (id) => api.delete(`/attendance/${id}`);

export const getAttendanceByStudent = async (studentId) => {
  const { data } = await api.get(`/attendance/student/${studentId}`)
  return data
}

export const createManualAttendance = async (attendanceData) => {
  const { data } = await api.post('/attendance/manual', attendanceData)
  return data
}

export const getAttendanceReport = async (tanggal, kelasId) => {
  const params = {}
  if (tanggal) params.tanggal = tanggal
  if (kelasId) params.kelas_id = kelasId
  const { data } = await api.get('/attendance/report', { params })
  return data
}

export const exportAttendanceReport = async (tanggal, kelasId) => {
  const params = new URLSearchParams()
  if (tanggal) params.append('tanggal', tanggal)
  if (kelasId) params.append('kelas_id', kelasId)
  
  const response = await api.get(`/attendance/export?${params.toString()}`, {
    responseType: 'blob' // Penting untuk download file
  })
  return response.data
}

export const getRekapSemester = async (kelasId) => {
  const { data } = await api.get('/attendance/rekap-semester', { params: { kelas_id: kelasId } })
  return data
}

export const exportRekapSemester = async (kelasId) => {
  const response = await api.get(`/attendance/export-semester?kelas_id=${kelasId}`, {
    responseType: 'blob'
  })
  return response.data
}

// ==================== Face Recognition ====================

export const registerFace = async (studentId, photoFile) => {
  const formData = new FormData()
  formData.append('photo', photoFile)
  const { data } = await api.post(`/face/register/${studentId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const getFaceStatus = async (studentId) => {
  const { data } = await api.get(`/face/status/${studentId}`)
  return data
}

export default api
