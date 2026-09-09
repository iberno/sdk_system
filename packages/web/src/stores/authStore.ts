import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { api, unwrap } from '@/lib/api'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
  companyId: string
  locale?: string
  solverGroupId?: string | null
}

interface Tokens {
  accessToken: string
  refreshToken?: string
}

interface LoginResponse extends Tokens {
  user: AuthUser
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  setTokens: (tokens: Tokens) => void
  setUser: (user: AuthUser | null) => void
  setLocale: (locale: string) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
        }),
      setUser: (user) => set({ user }),
      setLocale: (locale) =>
        set((state) => (state.user ? { user: { ...state.user, locale } } : state)),
      login: async (email, password) => {
        const data = unwrap<LoginResponse>(await api.post('/auth/login', { email, password }))
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? null,
          user: data.user,
        })
      },
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'sdk-auth' },
  ),
)
