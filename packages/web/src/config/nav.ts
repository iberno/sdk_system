import {
  BookOpen,
  Building2,
  CheckSquare,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Route,
  ScrollText,
  Shield,
  Ticket,
  Timer,
  TrendingUp,
  Users,
  UsersRound,
  Wrench,
  ListTodo,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  labelKey: string
  href: string
  icon: LucideIcon
  permissions?: string[]
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
      { labelKey: 'nav.myTickets', href: '/tickets/my', icon: ListTodo },
      {
        labelKey: 'tickets.unassignedQueue',
        href: '/tickets/queue',
        icon: Inbox,
        permissions: ['tickets.pickup'],
      },
      {
        labelKey: 'nav.approvals',
        href: '/approvals',
        icon: CheckSquare,
        permissions: ['approvals.read'],
      },
    ],
  },
  {
    sectionKey: 'nav.changes',
    items: [
      { labelKey: 'nav.changes', href: '/changes', icon: GitBranch, permissions: ['changes.read'] },
      { labelKey: 'nav.problems', href: '/problems', icon: Wrench, permissions: ['problems.read'] },
    ],
  },
  {
    sectionKey: 'nav.knowledge',
    items: [
      {
        labelKey: 'nav.knowledge',
        href: '/knowledge',
        icon: BookOpen,
        permissions: ['knowledge.read'],
      },
    ],
  },
  {
    sectionKey: 'nav.reports',
    items: [
      {
        labelKey: 'nav.reports',
        href: '/reports',
        icon: TrendingUp,
        permissions: ['reports.view'],
      },
    ],
  },
  {
    sectionKey: 'nav.admin',
    items: [
      { labelKey: 'nav.users', href: '/admin/users', icon: Users, permissions: ['admin.users'] },
      {
        labelKey: 'nav.companies',
        href: '/admin/companies',
        icon: Building2,
        permissions: ['admin.companies'],
      },
      {
        labelKey: 'nav.groups',
        href: '/admin/groups',
        icon: UsersRound,
        permissions: ['admin.groups'],
      },
      { labelKey: 'nav.sla', href: '/admin/sla', icon: Timer, permissions: ['admin.sla'] },
      {
        labelKey: 'nav.routingRules',
        href: '/admin/routing-rules',
        icon: Route,
        permissions: ['admin.routing'],
      },
      {
        labelKey: 'nav.audit',
        href: '/admin/audit',
        icon: ScrollText,
        permissions: ['admin.audit'],
      },
      {
        labelKey: 'nav.approvalFlows',
        href: '/admin/approval-flows',
        icon: CheckSquare,
        permissions: ['admin.flows'],
      },
      {
        labelKey: 'nav.roles',
        href: '/admin/roles',
        icon: Shield,
        permissions: ['admin.roles'],
      },
    ],
  },
]
