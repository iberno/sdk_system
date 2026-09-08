export interface TicketListItem {
  id: string
  ticketNumber: string
  title: string
  type: string
  status: string
  priority: string
  impact: string
  urgency: string
  slaResponseAt: string | null
  slaResolveAt: string | null
  slaBreached: boolean
  requester: { id: string; name: string } | null
  beneficiary: { id: string; name: string } | null
  assignee: { id: string; name: string } | null
  solverGroup: { id: string; name: string } | null
  company: { id: string; name: string } | null
  createdAt: string
  resolvedAt: string | null
}

export interface Paginated<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface ApiListResponse<T> extends Omit<Paginated<T>, 'items'> {
  statusCode: number
  message: string
  data: T[]
}