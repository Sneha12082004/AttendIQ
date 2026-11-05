import apiClient from './client'
import type { AuthResponse, LoginCredentials } from '../types'
import { DEMO_CREDENTIALS } from '../utils/constants'

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

    if (isDemoMode) {
      // Demo mode — return mock data
      const demo = DEMO_CREDENTIALS.find(
        (c) => c.email === credentials.email && c.role === credentials.role,
      )
      if (demo) {
        await new Promise((r) => setTimeout(r, 800)) // simulate network
        return {
          access_token: `demo_token_${demo.role}_${Date.now()}`,
          token_type: 'Bearer',
          user: {
            id: demo.id,
            email: demo.email,
            role: demo.role,
            full_name: demo.name,
            created_at: new Date().toISOString(),
          },
        }
      }
      throw new Error('Invalid demo credentials')
    }

    const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore errors on logout
    }
  },

  refreshToken: async (): Promise<{ access_token: string }> => {
    const response = await apiClient.post<{ access_token: string }>('/auth/refresh')
    return response.data
  },
}
