import apiClient from './client'
import type {
  AttendanceRecord,
  AttendanceReport,
  DailyAttendanceTrend,
  DashboardStats,
  SuspiciousAttempt,
  PaginatedResponse,
} from '../types'

export const attendanceApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/faculty/dashboard')
    return response.data
  },

  getAttendanceRecords: async (params?: {
    session_id?: string
    student_id?: string
    status?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<AttendanceRecord>> => {
    const response = await apiClient.get<PaginatedResponse<AttendanceRecord>>('/attendance', {
      params,
    })
    return response.data
  },

  getReports: async (params?: {
    subject_id?: string
    start_date?: string
    end_date?: string
    student_id?: string
  }): Promise<AttendanceReport[]> => {
    const response = await apiClient.get<AttendanceReport[]>('/reports/attendance', { params })
    return response.data
  },

  getDailyTrend: async (params?: {
    start_date?: string
    end_date?: string
    subject_id?: string
  }): Promise<DailyAttendanceTrend[]> => {
    const response = await apiClient.get<DailyAttendanceTrend[]>('/reports/daily-trend', { params })
    return response.data
  },

  getSuspiciousAttempts: async (params?: {
    reviewed?: boolean
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<SuspiciousAttempt>> => {
    const response = await apiClient.get<PaginatedResponse<SuspiciousAttempt>>(
      '/attendance/suspicious',
      { params },
    )
    return response.data
  },

  reviewSuspiciousAttempt: async (
    id: string,
    action: 'approve' | 'reject',
    note?: string,
  ): Promise<void> => {
    await apiClient.patch(`/attendance/suspicious/${id}/review`, { action, note })
  },

  manualOverride: async (payload: {
    attendance_record_id: string
    new_status: string
    reason: string
  }): Promise<void> => {
    await apiClient.post('/attendance/override', payload)
  },

  exportCSV: async (params?: Record<string, string>): Promise<Blob> => {
    const response = await apiClient.get('/reports/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}
