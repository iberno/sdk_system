import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { ApiListResponse } from '@/types/ticket'
import type { KnowledgeArticle } from '@/types/knowledge'

export function useKnowledgeArticles(
  params?: Record<string, string | number | boolean | undefined>,
  enabled = true,
) {
  return useQuery({
    queryKey: ['knowledge', params],
    queryFn: async () => {
      const { data: body } = await api.get<ApiListResponse<KnowledgeArticle>>('/knowledge', {
        params,
      })
      return { items: body.data, pagination: body.pagination }
    },
    enabled,
  })
}

export function useCreateArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post('/knowledge', payload)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

export function useUpdateArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      (await api.put(`/knowledge/${id}`, payload)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

export function usePublishArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/knowledge/${id}/publish`)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}

export function useDeleteArticle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/knowledge/${id}`)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['knowledge'] }),
  })
}
