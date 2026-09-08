import {
  BookOpen,
  CheckSquare,
  GitBranch,
  LayoutDashboard,
  Settings,
  Ticket,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  labelKey: string
  href: string
  icon: LucideIcon
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
      { labelKey: 'nav.reports', href: '/reports', icon: TrendingUp },
      { labelKey: 'nav.admin', href: '/admin', icon: Settings },
    ],
  },
]