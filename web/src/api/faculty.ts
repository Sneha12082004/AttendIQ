import apiClient from './client'
import type { Subject, Classroom, ClassSession, PaginatedResponse } from '../types'

export const facultyApi = {
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
