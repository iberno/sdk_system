export interface ProblemListItem {
  id: string
  title: string
  description: string
  status: string
  impact: string
  rootCause: string | null
  workaround: string | null
  solution: string | null
  company: { id: string; name: string } | null
  proposedChange: string | null
  linkedTickets: number
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface ProblemDetail {
  id: string
  title: string
  description: string
  status: string
  impact: string
  rootCause: string | null
  workaround: string | null
  solution: string | null
  company: { id: string; name: string } | null
  proposedChange: string | null
  linkedTickets: Array<{
    id: string
    ticketNumber: string
    title: string
    type: string
    status: string
    priority: string
  }>
  recurrence: Array<{ title: string; count: number }>
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export interface ChangeListItem {
  id: string
  title: string
  description: string
  type: string
  status: string
  risk: string
  reason: string
  plan: string
  rollbackPlan: string
  scheduledAt: string | null
  company: { id: string; name: string } | null
  requester: { id: string; name: string } | null
  solverGroup: { id: string; name: string } | null
  problem: { id: string; title: string } | null
  approvals: Array<{
    id: string
    order: number
    status: string
    approver: { id: string; name: string } | null
  }>
  linkedTickets: number
  createdAt: string
  updatedAt: string
}

export interface ChangeDetail {
  id: string
  title: string
  description: string
  type: string
  status: string
  risk: string
  reason: string
  plan: string
  rollbackPlan: string
  scheduledAt: string | null
  company: { id: string; name: string } | null
  requester: { id: string; name: string } | null
  solverGroup: { id: string; name: string } | null
  problem: { id: string; title: string } | null
  approvals: Array<{
    id: string
    order: number
    status: string
    comment: string | null
    approver: { id: string; name: string } | null
    createdAt: string
  }>
  linkedTickets: Array<{
    id: string
    ticketNumber: string
    title: string
    type: string
    status: string
    priority: string
  }>
  createdAt: string
  updatedAt: string
}
