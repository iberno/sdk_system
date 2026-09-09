import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { ApiListResponse, Paginated } from '@/types/ticket'
import type {
  AdminCompany,
  AdminGroup,
  AdminGroupDetail,
  AdminUser,
  ApprovalFlow,
  ApprovalItem,
  AuditLogEntry,
  RoutingRule,
  SlaPolicy,
} from '@/types/admin'
import type { DirectoryUser } from '@/types/ticket'

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, keys: string[][]) => {
  for (const key of keys) void queryClient.invalidateQueries({ queryKey: key })
}

// ---------- Users ----------

export function useAdminUsers(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const { data: body } = await api.get<ApiListResponse<AdminUser>>('/users', { params })
      return { items: body.data, pagination: body.pagination }
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post('/users', payload)).data,
    onSuccess: () =>
      invalidate(queryClient, [
        ['admin', 'users'],
        ['users', 'directory'],
      ]),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      (await api.put(`/users/${id}`, payload)).data,
    onSuccess: () =>
      invalidate(queryClient, [
        ['admin', 'users'],
        ['users', 'directory'],
      ]),
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/users/${id}/status`, { status })).data,
    onSuccess: () =>
      invalidate(queryClient, [
        ['admin', 'users'],
        ['users', 'directory'],
      ]),
  })
}

// ---------- Companies ----------

export function useAdminCompanies() {
  return useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: async () => {
      const { data: body } = await api.get<ApiListResponse<AdminCompany>>('/companies', {
        params: { pageSize: 100 },
      })
      return body.data
    },
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post('/companies', payload)).data,
    onSuccess: () =>
      invalidate(queryClient, [
        ['admin', 'companies'],
        ['companies', 'options'],
      ]),
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      (await api.put(`/companies/${id}`, payload)).data,
    onSuccess: () =>
      invalidate(queryClient, [
        ['admin', 'companies'],
        ['companies', 'options'],
      ]),
  })
}

export function useUpdateCompanyStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/companies/${id}/status`, { status })).data,
    onSuccess: () =>
      invalidate(queryClient, [
        ['admin', 'companies'],
        ['companies', 'options'],
      ]),
  })
}

// ---------- Solver groups ----------

export function useAdminGroups() {
  return useQuery({
    queryKey: ['admin', 'groups'],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: AdminGroup[]
      }>('/solver-groups')
      return body.data
    },
  })
}

export function useAdminGroupDetail(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'groups', id],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: AdminGroupDetail
      }>(`/solver-groups/${id}`)
      return body.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post('/solver-groups', payload)).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'groups'], ['solver-groups']]),
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      (await api.put(`/solver-groups/${id}`, payload)).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'groups'], ['solver-groups']]),
  })
}

export function useReplaceGroupAgents() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, agentIds }: { id: string; agentIds: string[] }) =>
      (await api.put(`/solver-groups/${id}/agents`, { agentIds })).data,
    onSuccess: () =>
      invalidate(queryClient, [['admin', 'groups'], ['solver-groups'], ['users', 'agents']]),
  })
}

export function useUpdateGroupStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/solver-groups/${id}/status`, { status })).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'groups'], ['solver-groups']]),
  })
}

// ---------- Routing rules ----------

export function useRoutingRules() {
  return useQuery({
    queryKey: ['admin', 'routing-rules'],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: RoutingRule[]
      }>('/routing-rules')
      return body.data
    },
  })
}

export function useCreateRoutingRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post('/routing-rules', payload)).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'routing-rules']]),
  })
}

export function useUpdateRoutingRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      (await api.put(`/routing-rules/${id}`, payload)).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'routing-rules']]),
  })
}

export function useUpdateRoutingRuleStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/routing-rules/${id}/status`, { status })).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'routing-rules']]),
  })
}

export function useReorderRoutingRules() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rules: { id: string; order: number }[]) =>
      (await api.post('/routing-rules/reorder', { rules })).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'routing-rules']]),
  })
}

// ---------- Approval flows ----------

export function useApprovalFlows(params?: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ['admin', 'approval-flows', params],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: ApprovalFlow[]
      }>('/approval-flows', { params })
      return body.data
    },
  })
}

export function useCreateApprovalFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post('/approval-flows', payload)).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'approval-flows']]),
  })
}

export function useUpdateApprovalFlow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      (await api.put(`/approval-flows/${id}`, payload)).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'approval-flows']]),
  })
}

export function useUpdateApprovalFlowStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/approval-flows/${id}/status`, { status })).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'approval-flows']]),
  })
}

export function useApproverCandidates() {
  return useQuery({
    queryKey: ['users', 'directory', 'approvers'],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: DirectoryUser[]
      }>('/users/directory')
      return body.data
    },
  })
}

// ---------- Audit ----------

// ---------- Approvals (minhas) ----------

export function useApprovals(status?: string) {
  return useQuery({
    queryKey: ['approvals', status],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: ApprovalItem[]
      }>('/approvals', { params: status ? { status } : {} })
      return body.data
    },
  })
}

export function useApproveApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) =>
      (await api.post(`/approvals/${id}/approve`, { comment })).data,
    onSuccess: () => invalidate(queryClient, [['approvals'], ['tickets'], ['ticket']]),
  })
}

export function useRejectApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) =>
      (await api.post(`/approvals/${id}/reject`, { comment })).data,
    onSuccess: () => invalidate(queryClient, [['approvals'], ['tickets'], ['ticket']]),
  })
}

export function useAuditLogs(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: async () => {
      const { data: body } = await api.get<ApiListResponse<AuditLogEntry>>('/audit', { params })
      return { items: body.data, pagination: body.pagination }
    },
  })
}

// ---------- SLA ----------

export function useAdminSla() {
  return useQuery({
    queryKey: ['admin', 'sla'],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: SlaPolicy[]
      }>('/sla-policies')
      return body.data
    },
  })
}

export function useCreateSlaPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post('/sla-policies', payload)).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'sla']]),
  })
}

export function useUpdateSlaPolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      (await api.put(`/sla-policies/${id}`, payload)).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'sla']]),
  })
}

export function useUpdateSlaPolicyStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/sla-policies/${id}/status`, { status })).data,
    onSuccess: () => invalidate(queryClient, [['admin', 'sla']]),
  })
}

// Re-export paginated helper types for admin lists
export type AdminUsersPage = Paginated<AdminUser>
