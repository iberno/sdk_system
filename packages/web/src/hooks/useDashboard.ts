import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

export interface DashboardSummary {
  period: { start: string; end: string }
  totals: {
    openTickets: number
    inProgress: number
    resolved: number
    slaBreached: number
    avgFirstResponseMin: number
    avgResolutionHours: number
  }
  byPriority: Record<string, number>
  byStatus: Record<string, number>
  byType: Record<string, number>
  byGroup: Array<{ group: string; count: number }>
  trend: Array<{ date: string; created: number; resolved: number }>
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data: body } = await api.get<{
        statusCode: number
        message: string
        data: DashboardSummary
      }>('/dashboard/summary')
      return body.data
    },
  })
}
