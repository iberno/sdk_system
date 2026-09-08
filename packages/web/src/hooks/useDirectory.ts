import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { SolverGroupOption, UserOption } from '@/types/ticket'

export function useSolverGroups(enabled = true) {
  return useQuery({
    queryKey: ['solver-groups'],
    queryFn: async () => {
      const { data: body } = await api.get<{ statusCode: number; message: string; data: SolverGroupOption[] }>(
        '/solver-groups',
      )
      return body.data
    },
    enabled,
  })
}

export function useAgents(enabled = true) {
  return useQuery({
    queryKey: ['users', 'agents'],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: UserOption[]
        pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
      }>('/users', {
        params: { role: 'AGENT', status: 'ACTIVE', pageSize: 100 },
      })
      return body.data
    },
    enabled,
  })
}