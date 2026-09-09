import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/lib/api'
import type {
  ChangeDetail,
  ChangeListItem,
  ProblemDetail,
  ProblemListItem,
} from '@/types/problem-change'
import type { ApiListResponse } from '@/types/ticket'

export function useProblems(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ['problems', params],
    queryFn: async () => {
      const { data: body } = await api.get<ApiListResponse<ProblemListItem>>('/problems', {
        params,
      })
      return { items: body.data, pagination: body.pagination }
    },
  })
}

export function useProblem(id: string | undefined) {
  return useQuery({
    queryKey: ['problem', id],
    queryFn: async () => unwrap<ProblemDetail>(await api.get(`/problems/${id}`)),
    enabled: Boolean(id),
  })
}

export function useCreateProblem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      title: string
      description: string
      impact?: string
      companyId?: string
    }) => unwrap<ProblemDetail>(await api.post('/problems', payload)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['problems'] }),
  })
}

export function useUpdateProblem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string
      title?: string
      description?: string
      impact?: string
      status?: string
      rootCause?: string
      workaround?: string
      solution?: string
    }) => unwrap<ProblemDetail>(await api.put(`/problems/${id}`, payload)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['problems'] }),
  })
}

export function useChanges(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ['changes', params],
    queryFn: async () => {
      const { data: body } = await api.get<ApiListResponse<ChangeListItem>>('/changes', { params })
      return { items: body.data, pagination: body.pagination }
    },
  })
}

export function useChange(id: string | undefined) {
  return useQuery({
    queryKey: ['change', id],
    queryFn: async () => unwrap<ChangeDetail>(await api.get(`/changes/${id}`)),
    enabled: Boolean(id),
  })
}

export function useCreateChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      title: string
      description: string
      type?: string
      risk?: string
      reason: string
      plan: string
      rollbackPlan: string
      scheduledAt?: string
      companyId?: string
      solverGroupId?: string
    }) => unwrap<ChangeDetail>(await api.post('/changes', payload)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['changes'] }),
  })
}

export function useUpdateChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string
      title?: string
      description?: string
      type?: string
      risk?: string
      reason?: string
      plan?: string
      rollbackPlan?: string
      scheduledAt?: string
    }) => unwrap<ChangeDetail>(await api.put(`/changes/${id}`, payload)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['changes'] }),
  })
}

export function useSubmitChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap<ChangeDetail>(await api.post(`/changes/${id}/submit`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['changes'] }),
  })
}

export function useExecuteChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap<ChangeDetail>(await api.post(`/changes/${id}/execute`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['changes'] }),
  })
}

export function useRollbackChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap<ChangeDetail>(await api.post(`/changes/${id}/rollback`)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['changes'] }),
  })
}
