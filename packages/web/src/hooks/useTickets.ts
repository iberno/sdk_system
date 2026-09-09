import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { ApiListResponse, TicketListItem, TicketDetail } from '@/types/ticket'

type TicketParams = Record<string, string | number | boolean | undefined>

export function useTickets(params?: TicketParams) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: async () => {
      const { data: body } = await api.get<ApiListResponse<TicketListItem>>('/tickets', { params })
      return { items: body.data, pagination: body.pagination }
    },
  })
}

export function useUnassignedTickets() {
  return useQuery({
    queryKey: ['tickets', 'unassigned'],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: { items: TicketListItem[] }
      }>('/tickets/unassigned')
      return body.data.items ?? []
    },
  })
}

export function useMyTickets(params?: TicketParams) {
  return useQuery({
    queryKey: ['tickets', 'my', params],
    queryFn: async () => {
      const { data: body } = await api.get<ApiListResponse<TicketListItem>>('/tickets/my', {
        params,
      })
      return { items: body.data, pagination: body.pagination }
    },
  })
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: TicketDetail
      }>(`/tickets/${id}`)
      return body.data
    },
    enabled: Boolean(id),
  })
}
