import apiClient from './client'
import type { Subject, Classroom, ClassSession, PaginatedResponse } from '../types'

export const facultyApi = {
  getDashboard: async (): Promise<any> => {
    const response = await apiClient.get<any>('/faculty/dashboard')
    return response.data
  },

  getSessions: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/faculty/sessions')
    return response.data
  },

  getReports: async (subject_id?: string): Promise<any> => {
    const response = await apiClient.get<any>('/faculty/reports', {
      params: subject_id ? { subject_id } : undefined,
    })
    return response.data
  },

  getSubjects: async (): Promise<Subject[]> => {
    const response = await apiClient.get<Subject[]>('/faculty/subjects')
    return response.data
  },

  getClassrooms: async (): Promise<Classroom[]> => {
    const response = await apiClient.get<Classroom[]>('/faculty/classrooms')
    return response.data
  },

  getMySessions: async (params?: {
    status?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<ClassSession>> => {
    const response = await apiClient.get<PaginatedResponse<ClassSession>>('/faculty/sessions', {
      params,
    })
    return response.data
  },
}
