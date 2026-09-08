import axios from 'axios'

import { useAuthStore } from '@/stores/authStore'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined
    const refreshToken = useAuthStore.getState().refreshToken

    if (error.response?.status === 401 && original && !original._retry && refreshToken) {
      original._retry = true
      try {
        const { data } = await axios.post(
          '/api/auth/refresh',
          undefined,
          { headers: { Authorization: `Bearer ${refreshToken}` } },
        )
        const tokens = data.data as { accessToken: string; refreshToken?: string }
        useAuthStore.getState().setTokens(tokens)
        original.headers.Authorization = `Bearer ${tokens.accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  },
)

export const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T }
  return body.data ?? (body as unknown as T)
}