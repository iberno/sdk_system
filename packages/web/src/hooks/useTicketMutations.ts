import { useMutation, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/lib/api'
import type { TicketDetail } from '@/types/ticket'

export interface CreateTicketPayload {
  title: string
  description: string
  type: string
  priority?: string
  companyId?: string
  categoryId?: string
  beneficiaryId?: string
}

function invalidateTicket(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  void queryClient.invalidateQueries({ queryKey: ['ticket', id] })
  void queryClient.invalidateQueries({ queryKey: ['tickets'] })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTicketPayload) =>
      unwrap<TicketDetail>(await api.post('/tickets', payload)),
    onSuccess: (ticket) => invalidateTicket(queryClient, ticket.id),
  })
}

export function useChangeStatus(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { status: string; resolutionNote?: string }) =>
      unwrap<TicketDetail>(await api.post(`/tickets/${id}/status`, payload)),
    onSuccess: (ticket) => invalidateTicket(queryClient, ticket.id),
  })
}

export function useAddComment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { content: string; visibility: 'PUBLIC' | 'INTERNAL' }) =>
      unwrap<{ id: string }>(await api.post(`/tickets/${id}/comments`, payload)),
    onSuccess: () => invalidateTicket(queryClient, id),
  })
}

export function useAssignTicket(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { assigneeId?: string; solverGroupId?: string }) =>
      unwrap<TicketDetail>(await api.post(`/tickets/${id}/assign`, payload)),
    onSuccess: (ticket) => invalidateTicket(queryClient, ticket.id),
  })
}

export function usePickupTicket(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { solverGroupId: string }) =>
      unwrap<TicketDetail>(await api.post(`/tickets/${id}/pickup`, payload)),
    onSuccess: (ticket) => invalidateTicket(queryClient, ticket.id),
  })
}

export function useUploadAttachment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return unwrap<TicketDetail>(await api.post(`/tickets/${id}/attachments`, form))
    },
    onSuccess: (ticket) => invalidateTicket(queryClient, ticket.id),
  })
}
