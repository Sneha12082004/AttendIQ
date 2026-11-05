import apiClient from './client'
import type {
  AdminDashboardStats,
  Student,
  Faculty,
  Classroom,
  Department,
  Subject,
  Defaulter,
  AuditLog,
  SuspiciousAttempt,
  SystemSettings,
  PaginatedResponse,
} from '../types'

export const adminApi = {
  getDashboardStats: async (): Promise<AdminDashboardStats> => {
    const response = await apiClient.get<AdminDashboardStats>('/admin/dashboard')
    return response.data
  },

  // Students
  getStudents: async (params?: {
    search?: string
    department_id?: string
    section?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<Student>> => {
    const response = await apiClient.get<PaginatedResponse<Student>>('/admin/students', { params })
    return response.data
  },

  createStudent: async (data: Partial<Student>): Promise<Student> => {
    const response = await apiClient.post<Student>('/admin/students', data)
    return response.data
  },

  updateStudent: async (id: string, data: Partial<Student>): Promise<Student> => {
    const response = await apiClient.patch<Student>(`/admin/students/${id}`, data)
    return response.data
  },

  deleteStudent: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/students/${id}`)
  },

  // Faculty
  getFaculty: async (params?: {
    search?: string
    department_id?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<Faculty>> => {
    const response = await apiClient.get<PaginatedResponse<Faculty>>('/admin/faculty', { params })
    return response.data
  },

  createFaculty: async (data: Partial<Faculty>): Promise<Faculty> => {
    const response = await apiClient.post<Faculty>('/admin/faculty', data)
    return response.data
  },

  updateFaculty: async (id: string, data: Partial<Faculty>): Promise<Faculty> => {
    const response = await apiClient.patch<Faculty>(`/admin/faculty/${id}`, data)
    return response.data
  },

  deleteFaculty: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/faculty/${id}`)
  },

  // Classrooms
  getClassrooms: async (params?: {
    search?: string
    building?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<Classroom>> => {
    const response = await apiClient.get<PaginatedResponse<Classroom>>('/admin/classrooms', {
      params,
    })
    return response.data
  },

  createClassroom: async (data: Partial<Classroom>): Promise<Classroom> => {
    const response = await apiClient.post<Classroom>('/admin/classrooms', data)
    return response.data
  },

  updateClassroom: async (id: string, data: Partial<Classroom>): Promise<Classroom> => {
    const response = await apiClient.patch<Classroom>(`/admin/classrooms/${id}`, data)
    return response.data
  },

  deleteClassroom: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/classrooms/${id}`)
  },

  // Departments
  getDepartments: async (): Promise<Department[]> => {
    const response = await apiClient.get<Department[]>('/admin/departments')
    return response.data
  },

  createDepartment: async (data: Partial<Department>): Promise<Department> => {
    const response = await apiClient.post<Department>('/admin/departments', data)
    return response.data
  },

  updateDepartment: async (id: string, data: Partial<Department>): Promise<Department> => {
    const response = await apiClient.patch<Department>(`/admin/departments/${id}`, data)
    return response.data
  },

  // Subjects
  getSubjects: async (params?: { department_id?: string; semester?: number }): Promise<Subject[]> => {
    const response = await apiClient.get<Subject[]>('/admin/subjects', { params })
    return response.data
  },

  // Defaulters
  getDefaulters: async (params?: {
    threshold?: number
    department_id?: string
  }): Promise<Defaulter[]> => {
    const response = await apiClient.get<Defaulter[]>('/admin/defaulters', { params })
    return response.data
  },

  // Audit logs
  getAuditLogs: async (params?: {
    page?: number
    per_page?: number
    user_id?: string
    action?: string
  }): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', {
      params,
    })
    return response.data
  },

  // System-wide suspicious
  getSuspiciousAttempts: async (params?: {
    reviewed?: boolean
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<SuspiciousAttempt>> => {
    const response = await apiClient.get<PaginatedResponse<SuspiciousAttempt>>(
      '/admin/suspicious',
      { params },
    )
    return response.data
  },

  // Settings
  getSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get<SystemSettings>('/admin/settings')
    return response.data
  },

  updateSettings: async (data: Partial<SystemSettings>): Promise<SystemSettings> => {
    const response = await apiClient.patch<SystemSettings>('/admin/settings', data)
    return response.data
  },
}
