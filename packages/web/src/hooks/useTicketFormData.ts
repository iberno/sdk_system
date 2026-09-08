import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { CategoryOption, CompanyOption, DirectoryUser } from '@/types/ticket'

export function useCompanyOptions() {
  return useQuery({
    queryKey: ['companies', 'options'],
    queryFn: async () => {
      const { data: body } = await api.get<{ statusCode: number; message: string; data: CompanyOption[] }>(
        '/companies/options',
      )
      return body.data
    },
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data: body } = await api.get<{ statusCode: number; message: string; data: CategoryOption[] }>(
        '/categories',
      )
      return body.data
    },
  })
}

export function useUserDirectory(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ['users', 'directory', companyId ?? 'none'],
    queryFn: async () => {
      const { data: body } = await api.get<{ statusCode: number; message: string; data: DirectoryUser[] }>(
        '/users/directory',
        { params: companyId ? { companyId } : {} },
      )
      return body.data
    },
    enabled: Boolean(companyId),
  })
}