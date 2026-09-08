export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  locale: string
  companyId: string | null
  solverGroupId: string | null
  createdAt: string
  company: { id: string; name: string } | null
  solverGroup: { id: string; name: string; level: string } | null
}

export interface AdminCompany {
  id: string
  name: string
  cnpj: string | null
  status: string
  usersCount: number
  ticketsCount: number
  createdAt: string
}

export interface AdminGroup {
  id: string
  name: string
  description: string | null
  level: string
  status: string
  agentsCount: number
  openTickets: number
}

export interface AdminGroupDetail extends AdminGroup {
  agents: { id: string; name: string; email: string; status: string }[]
}

export interface RoutingRule {
  id: string
  name: string
  description: string | null
  ticketType: string
  priority: string | null
  category: string | null
  strategy: string
  targetGroupId: string | null
  order: number
  status: string
  createdAt: string
  targetGroup: { id: string; name: string; level: string } | null
}

export interface ApprovalStageData {
  order: number
  approverRole?: string
  approverCategory?: string
  solverGroupId?: string
  userId?: string
}

export interface ApprovalFlow {
  id: string
  name: string
  description: string | null
  entityType: string
  rules: { stages?: ApprovalStageData[] }
  status: string
  createdAt: string
  companyId: string | null
  company: { id: string; name: string } | null
}

export interface AuditLogEntry {
  id: string
  action: string
  entity: string
  entityId: string | null
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
  userId: string | null
  user: { id: string; name: string; email: string } | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export interface SlaPolicy {
  id: string
  name: string
  description: string | null
  type: string
  priority: string
  responseTime: number
  resolveTime: number
  status: string
  createdAt: string
  updatedAt: string
}