import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

const STATUS_TONES = {
  OPEN: 'primary',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  CLOSED: 'neutral',
} as const

const PRIORITY_TONES = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
} as const

const today = new Date().toISOString().slice(0, 10)
const tickets = [
  {
    id: '1',
    number: 'SD-2026-000067',
    title: 'pendencia tc e assigned',
    status: 'OPEN' as const,
    priority: 'MEDIUM' as const,
    created: today,
  },
  {
    id: '2',
    number: 'SD-2026-000065',
    title: 'Acesso ao VPN',
    status: 'IN_PROGRESS' as const,
    priority: 'HIGH' as const,
    created: today,
  },
  {
    id: '3',
    number: 'SD-2026-000061',
    title: 'Notebook com lentidão',
    status: 'RESOLVED' as const,
    priority: 'LOW' as const,
    created: today,
  },
]

export default function DashboardPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-graydark dark:text-white">
          {t('nav.dashboard')}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Abertos" bodyClassName="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock className="size-5" />
          </div>
          <span className="text-2xl font-bold text-graydark dark:text-white">0</span>
        </Card>
        <Card title="Em andamento" bodyClassName="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
            <ArrowUpRight className="size-5" />
          </div>
          <span className="text-2xl font-bold text-graydark dark:text-white">0</span>
        </Card>
        <Card title="Resolvidos" bodyClassName="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="size-5" />
          </div>
          <span className="text-2xl font-bold text-graydark dark:text-white">0</span>
        </Card>
        <Card title="Críticos" bodyClassName="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10 text-error">
            <AlertTriangle className="size-5" />
          </div>
          <span className="text-2xl font-bold text-graydark dark:text-white">0</span>
        </Card>
      </div>

      <Card title="Tickets recentes (demo)" subtitle={today}>
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-stroke px-4 py-3 dark:border-strokedark"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-graydark dark:text-white">
                  {ticket.title}
                </p>
                <p className="text-xs text-bodystroke">{ticket.number}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={PRIORITY_TONES[ticket.priority]}>
                  {t(`domain.priority.${ticket.priority}`)}
                </Badge>
                <Badge tone={STATUS_TONES[ticket.status]}>
                  {t(`domain.status.${ticket.status}`)}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}