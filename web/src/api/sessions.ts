import apiClient from './client'
import type {
  ClassSession,
  CreateSessionPayload,
  LiveAttendanceFeed,
  ManualOverridePayload,
  PaginatedResponse,
} from '../types'

export const sessionsApi = {
  listSessions: async (params?: {
    status?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<ClassSession>> => {
    const response = await apiClient.get<PaginatedResponse<ClassSession>>('/sessions', { params })
    return response.data
  },

  getSession: async (id: string): Promise<ClassSession> => {
    const response = await apiClient.get<ClassSession>(`/sessions/${id}`)
    return response.data
  },

  createSession: async (payload: CreateSessionPayload): Promise<any> => {
    // Try /sessions/create first (FastAPI endpoint), fallback to /sessions
    try {
      const response = await apiClient.post<any>('/sessions/create', payload)
      return response.data
    } catch {
      const response = await apiClient.post<any>('/sessions', payload)
      return response.data
    }
  },

  closeSession: async (id: string): Promise<any> => {
    // Backend router defines PUT /sessions/{id}/close
    try {
      const response = await apiClient.put<any>(`/sessions/${id}/close`)
      return response.data
    } catch {
      const response = await apiClient.patch<any>(`/sessions/${id}/close`)
      return response.data
    }
  },

  getSessionAttendance: async (sessionId: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/attendance/session/${sessionId}`)
    return response.data
  },

  getLiveFeed: async (sessionId: string): Promise<LiveAttendanceFeed> => {
    const response = await apiClient.get<LiveAttendanceFeed>(`/sessions/${sessionId}/live`)
    return response.data
  },

  getSessionQR: async (sessionId: string): Promise<{ qr_token: string; expires_at: string }> => {
    const response = await apiClient.get<{ qr_token: string; expires_at: string }>(
      `/sessions/${sessionId}/qr`,
    )
    return response.data
  },

  manualOverride: async (payload: ManualOverridePayload): Promise<void> => {
    await apiClient.post('/attendance/override', payload)
  },

  exportSessionCSV: async (sessionId: string): Promise<Blob> => {
    const response = await apiClient.get(`/sessions/${sessionId}/export`, {
      responseType: 'blob',
    })
    return response.data
  },
}
