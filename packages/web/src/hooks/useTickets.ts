import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import type { ApiListResponse, TicketListItem } from '@/types/ticket'

type TicketParams = Record<string, string | number | boolean | undefined>

export function useTickets(params?: TicketParams) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: async () => {
      const { data: body } = await api.get<ApiListResponse<TicketListItem>>(
        '/tickets',
        { params },
      )
      return { items: body.data, pagination: body.pagination }
    },
  })
}