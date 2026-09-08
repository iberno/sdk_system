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
  category: { id: string; name: string; path: string } | null
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

export interface TicketCommentData {
  id: string
  content: string
  visibility: 'PUBLIC' | 'INTERNAL'
  author: { id: string; name: string }
  createdAt: string
}

export interface TicketHistoryEntry {
  field: string
  oldValue: string | null
  newValue: string | null
  userId: string
  createdAt: string
}

export interface ApprovalInfo {
  id: string
  status: string
  order: number
  comment: string | null
  approver: { id: string; name: string } | null
  flowName: string | null
}

export interface AttachmentInfo {
  id: string
  filename: string
  url: string
  size: number
  mimetype: string
  createdAt: string
}

export interface RelatedItem {
  id: string
  title: string
  status: string
}

export interface TicketDetail {
  id: string
  ticketNumber: string
  title: string
  description: string
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
  assignee: { id: string; name: string; solverGroupId: string | null } | null
  solverGroup: { id: string; name: string; level: string } | null
  company: { id: string; name: string } | null
  category: { id: string; name: string; path: string } | null
  routedBy: {
    auto: boolean
    strategy: string | null
    routingRuleId: string | null
    appliedAt: string
  }
  approvals: ApprovalInfo[]
  timeline: {
    createdAt: string
    firstResponseAt: string | null
    resolvedAt: string | null
    closedAt: string | null
  }
  comments: TicketCommentData[]
  history: TicketHistoryEntry[]
  attachments: AttachmentInfo[]
  relatedProblem: RelatedItem | null
  relatedChanges: RelatedItem[]
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  closedAt: string | null
}

export interface SolverGroupOption {
  id: string
  name: string
  level: string
}

export interface UserOption {
  id: string
  name: string
  email: string
  role: string
  status: string
  solverGroupId: string | null
}

export interface CompanyOption {
  id: string
  name: string
}

export interface CategoryOption {
  id: string
  name: string
  parentId: string | null
  path: string
  depth: number
  status: string
  order: number
}

export interface DirectoryUser {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  companyId: string | null
}