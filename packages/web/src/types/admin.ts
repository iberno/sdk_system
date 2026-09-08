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