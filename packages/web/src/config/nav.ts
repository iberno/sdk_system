import {
  BookOpen,
  Building2,
  CheckSquare,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Route,
  ScrollText,
  Ticket,
  Timer,
  TrendingUp,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  labelKey: string
  href: string
  icon: LucideIcon
  roles?: string[]
}

export interface NavSection {
  sectionKey?: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ labelKey: 'nav.dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    sectionKey: 'nav.tickets',
    items: [
      { labelKey: 'nav.tickets', href: '/tickets', icon: Ticket },
      {
        labelKey: 'tickets.unassignedQueue',
        href: '/tickets/queue',
        icon: Inbox,
        roles: ['AGENT', 'MANAGER', 'ADMIN'],
      },
      { labelKey: 'nav.approvals', href: '/approvals', icon: CheckSquare },
    ],
  },
  {
    sectionKey: 'nav.changes',
    items: [
      { labelKey: 'nav.changes', href: '/changes', icon: GitBranch },
      { labelKey: 'nav.problems', href: '/problems', icon: Wrench },
    ],
  },
  {
    sectionKey: 'nav.knowledge',
    items: [{ labelKey: 'nav.knowledge', href: '/knowledge', icon: BookOpen }],
  },
  {
    sectionKey: 'nav.reports',
    items: [
      {
        labelKey: 'nav.reports',
        href: '/reports',
        icon: TrendingUp,
        roles: ['ADMIN', 'MANAGER', 'AGENT'],
      },
    ],
  },
  {
    sectionKey: 'nav.admin',
    items: [
      { labelKey: 'nav.users', href: '/admin/users', icon: Users, roles: ['ADMIN', 'MANAGER'] },
      { labelKey: 'nav.companies', href: '/admin/companies', icon: Building2, roles: ['ADMIN'] },
      {
        labelKey: 'nav.groups',
        href: '/admin/groups',
        icon: UsersRound,
        roles: ['ADMIN', 'MANAGER'],
      },
      { labelKey: 'nav.sla', href: '/admin/sla', icon: Timer, roles: ['ADMIN', 'MANAGER'] },
      {
        labelKey: 'nav.routingRules',
        href: '/admin/routing-rules',
        icon: Route,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        labelKey: 'nav.audit',
        href: '/admin/audit',
        icon: ScrollText,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        labelKey: 'nav.approvalFlows',
        href: '/admin/approval-flows',
        icon: CheckSquare,
        roles: ['ADMIN', 'MANAGER'],
      },
    ],
  },
]
