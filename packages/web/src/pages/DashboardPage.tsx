import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Inbox,
  ListFilter,
  Timer,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useTickets } from '@/hooks/useTickets'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { BadgeTone } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table } from '@/components/ui/Table'
import type { Column, SortDirection } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { TicketListItem } from '@/types/ticket'

const STATUS_TONE: Record<string, BadgeTone> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  PENDING: 'neutral',
  WAITING_USER: 'info',
  WAITING_APPROVAL: 'primary',
  RESOLVED: 'success',
  CLOSED: 'neutral',
}

const PRIORITY_TONE: Record<string, BadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
}

const TYPE_TONE: Record<string, BadgeTone> = {
  INCIDENT: 'warning',
  SERVICE_REQUEST: 'primary',
  CHANGE_REQUEST: 'info',
  PROBLEM: 'neutral',
}

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const
const STATUS_ORDER = [
  'OPEN',
  'IN_PROGRESS',
  'PENDING',
  'WAITING_USER',
  'WAITING_APPROVAL',
  'RESOLVED',
  'CLOSED',
] as const

const CLOSED_STATES = new Set(['CLOSED', 'RESOLVED'])
const WAITING_STATES = new Set(['WAITING_APPROVAL', 'WAITING_USER', 'PENDING'])

const isOpen = (status: string) => !CLOSED_STATES.has(status)

interface Stats {
  total: number
  open: number
  inProgress: number
  waiting: number
  resolved: number
  closed: number
  breached: number
  slaPct: number
  byPriority: { label: string; value: number }[]
  byStatus: { label: string; value: number }[]
}

function computeStats(tickets: TicketListItem[]): Stats {
  const openTickets = tickets.filter((t) => isOpen(t.status))
  const breached = openTickets.filter((t) => t.slaBreached)
  const byPriority = PRIORITY_ORDER.map((label) => ({
    label,
    value: openTickets.filter((t) => t.priority === label).length,
  })).filter((item) => item.value > 0)
  const byStatus = STATUS_ORDER.map((label) => ({
    label,
    value: tickets.filter((t) => t.status === label).length,
  })).filter((item) => item.value > 0)
  return {
    total: tickets.length,
    open: openTickets.length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    waiting: tickets.filter((t) => WAITING_STATES.has(t.status)).length,
    resolved: tickets.filter((t) => CLOSED_STATES.has(t.status)).length,
    closed: tickets.filter((t) => t.status === 'CLOSED').length,
    breached: breached.length,
    slaPct: openTickets.length
      ? Math.round(((openTickets.length - breached.length) / openTickets.length) * 100)
      : 100,
    byPriority,
    byStatus,
  }
}

interface Metric {
  label: string
  value: string | number
  icon: LucideIcon
  iconClass: string
  subtitle: string
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-medium text-bodystroke">{metric.label}</span>
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-graydark dark:text-white">
            {metric.value}
          </span>
        </div>
        <div className={cn('flex size-9 items-center justify-center rounded-lg', metric.iconClass)}>
          <Icon className="size-4.5" />
        </div>
      </div>
      <p className="mt-4 text-xs text-bodystroke">{metric.subtitle}</p>
    </Card>
  )
}

function MetricSkeleton() {
  return (
    <Card>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="mt-4 h-3 w-28" />
    </Card>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useState<string | null>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const { data, isLoading, isError, refetch } = useTickets({ pageSize: 100 })

  const tickets = useMemo(() => data?.items ?? [], [data])
  const stats = useMemo(() => computeStats(tickets), [tickets])

  const sorted = useMemo(() => {
    const next = [...tickets]
    next.sort((a, b) => {
      if (!sortBy) return b.createdAt.localeCompare(a.createdAt)
      const aV = String(a[sortBy as keyof TicketListItem] ?? '')
      const bV = String(b[sortBy as keyof TicketListItem] ?? '')
      const result = aV.localeCompare(bV)
      return sortDirection === 'asc' ? result : -result
    })
    return next.slice(0, 8)
  }, [tickets, sortBy, sortDirection])

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDirection('asc')
    }
  }

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(iso))

  const columns: Array<Column<TicketListItem>> = [
    {
      key: 'ticketNumber',
      header: t('nav.tickets'),
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-graydark dark:text-white">{row.title}</span>
          <span className="text-xs tabular-nums text-bodystroke">{row.ticketNumber}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('dashboard.type'),
      render: (row) => <Badge tone={TYPE_TONE[row.type]}>{t(`domain.type.${row.type}`)}</Badge>,
    },
    {
      key: 'status',
      header: t('common.status'),
      sortable: true,
      render: (row) => (
        <Badge tone={STATUS_TONE[row.status]} dot>
          {t(`domain.status.${row.status}`)}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: t('dashboard.priority'),
      sortable: true,
      render: (row) => (
        <Badge tone={PRIORITY_TONE[row.priority]}>{t(`domain.priority.${row.priority}`)}</Badge>
      ),
    },
    {
      key: 'requester',
      header: t('dashboard.requester'),
      render: (row) =>
        row.requester ? (
          <div className="flex items-center gap-2.5">
            <Avatar name={row.requester.name} size="sm" />
            <span className="text-sm text-body dark:text-bodydark">{row.requester.name}</span>
          </div>
        ) : (
          <span className="text-bodystroke">—</span>
        ),
    },
    {
      key: 'createdAt',
      header: t('dashboard.created'),
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums text-body dark:text-bodydark">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ]

  const metrics: Metric[] = [
    {
      label: t('dashboard.open'),
      value: stats.open,
      icon: Inbox,
      iconClass: 'bg-primary/10 text-primary',
      subtitle: t('dashboard.total', { count: stats.total }),
    },
    {
      label: t('dashboard.inProgress'),
      value: stats.inProgress,
      icon: Clock,
      iconClass: 'bg-amber-500/10 text-warning',
      subtitle: t('dashboard.waiting', { count: stats.waiting }),
    },
    {
      label: t('dashboard.resolved'),
      value: stats.resolved,
      icon: CheckCircle2,
      iconClass: 'bg-emerald-500/10 text-success',
      subtitle: t('dashboard.closed', { count: stats.closed }),
    },
    {
      label: t('dashboard.slaLabel'),
      value: `${stats.slaPct}%`,
      icon: Timer,
      iconClass: 'bg-sky-500/10 text-info',
      subtitle: stats.breached
        ? t('dashboard.breach', { count: stats.breached })
        : t('dashboard.noBreach'),
    },
  ]

  const maxPriority = Math.max(1, ...stats.byPriority.map((p) => p.value))
  const maxStatus = Math.max(1, ...stats.byStatus.map((s) => s.value))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('app.tagline')}
          </h1>
          <p className="text-sm text-bodystroke">
            {t('nav.dashboard')} ·{' '}
            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}
          </p>
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-32 rounded-lg" />
        ) : (
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2',
              stats.breached > 0
                ? 'border-warning/30 bg-warning/10'
                : 'border-primary/20 bg-primary/5',
            )}
          >
            <TrendingUp
              className={cn('size-4', stats.breached > 0 ? 'text-warning' : 'text-primary')}
            />
            <span
              className={cn(
                'text-sm font-medium tabular-nums',
                stats.breached > 0 ? 'text-warning' : 'text-primary',
              )}
            >
              {t('dashboard.sla')} {stats.slaPct}%
            </span>
          </div>
        )}
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-6 text-error" />}
            title={t('common.error')}
            description={t('dashboard.loadError')}
            action={
              <Button variant="secondary" onClick={() => void refetch()}>
                {t('common.retry')}
              </Button>
            }
          />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => <MetricSkeleton key={index} />)
          : metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card
          title={t('dashboard.recent')}
          subtitle={t('dashboard.records', { count: stats.total })}
          actions={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ListFilter className="size-3.5" />
              {t('dashboard.filter')}
            </button>
          }
          className="xl:col-span-2"
          bodyClassName="px-0 pb-0"
        >
          <Table<TicketListItem>
            columns={columns}
            rows={isLoading ? [] : sorted}
            keyFor={(row) => row.id}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={isLoading}
            empty={t('common.empty')}
          />
        </Card>

        <div className="flex flex-col gap-5">
          <Card
            title={t('dashboard.priorities')}
            subtitle={t('dashboard.prioritiesSub')}
            bodyClassName="flex flex-col gap-3.5"
          >
            {stats.byPriority.map((item) => (
              <ProgressRow
                key={item.label}
                label={t(`domain.priority.${item.label}`)}
                value={item.value}
                max={maxPriority}
                tone={PRIORITY_TONE[item.label] ?? 'neutral'}
              />
            ))}
          </Card>

          <Card
            title={t('dashboard.statusDist')}
            subtitle={t('dashboard.records', { count: stats.total })}
            bodyClassName="flex flex-col gap-3.5"
          >
            {stats.byStatus.map((item) => (
              <ProgressRow
                key={item.label}
                label={t(`domain.status.${item.label}`)}
                value={item.value}
                max={maxStatus}
                tone={STATUS_TONE[item.label] ?? 'neutral'}
              />
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

interface ProgressRowProps {
  label: string
  value: number
  max: number
  tone: string
}

function ProgressRow({ label, value, max, tone }: ProgressRowProps) {
  const percentage = Math.round((value / max) * 100)
  const barTone: Record<string, string> = {
    error: 'bg-error',
    warning: 'bg-warning',
    info: 'bg-info',
    neutral: 'bg-bodystroke',
    success: 'bg-success',
    primary: 'bg-primary',
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-graydark dark:text-white">{label}</span>
        <span className="tabular-nums text-bodystroke">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stroke/80 dark:bg-strokedark">
        <div
          className={cn('h-full rounded-full transition-all', barTone[tone])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
