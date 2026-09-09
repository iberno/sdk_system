import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  Building2,
  CheckSquare,
  Route,
  ScrollText,
  Shield,
  Timer,
  Users,
  UsersRound,
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/admin/users', labelKey: 'nav.users', icon: Users, permission: 'admin.users' },
  {
    to: '/admin/companies',
    labelKey: 'nav.companies',
    icon: Building2,
    permission: 'admin.companies',
  },
  { to: '/admin/groups', labelKey: 'nav.groups', icon: UsersRound, permission: 'admin.groups' },
  { to: '/admin/sla', labelKey: 'nav.sla', icon: Timer, permission: 'admin.sla' },
  {
    to: '/admin/routing-rules',
    labelKey: 'nav.routingRules',
    icon: Route,
    permission: 'admin.routing',
  },
  { to: '/admin/audit', labelKey: 'nav.audit', icon: ScrollText, permission: 'admin.audit' },
  {
    to: '/admin/approval-flows',
    labelKey: 'nav.approvalFlows',
    icon: CheckSquare,
    permission: 'admin.flows',
  },
  {
    to: '/admin/roles',
    labelKey: 'nav.roles',
    icon: Shield,
    permission: 'admin.roles',
  },
] as const

export default function AdminLayout() {
  const { t } = useTranslation()
  const { hasPermission } = usePermissions()

  const tabs = TABS.filter((tab) => hasPermission(tab.permission))

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
          {t('nav.admin')}
        </h1>
        <p className="text-sm text-bodystroke">{t('admin.subtitle')}</p>
      </div>

      <nav className="flex flex-wrap gap-1.5 rounded-xl border border-stroke bg-white p-1.5 dark:border-strokedark dark:bg-boxdark">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-card'
                  : 'text-bodystroke hover:bg-graylight hover:text-body dark:text-bodydark dark:hover:bg-boxdark-2',
              )
            }
          >
            <tab.icon className="size-4" />
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
