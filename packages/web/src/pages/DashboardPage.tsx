import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Inbox,
  ListFilter,
  Timer,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { BadgeTone } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import type { Column, SortDirection } from '@/components/ui/Table'
import { cn } from '@/lib/utils'

const STATUS_TONE: Record<string, BadgeTone> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
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

interface TicketRow {
  id: string
  number: string
  title: string
  type: string
  status: string
  priority: string
  requester: { name: string; initials: string }
  createdAt: string
}

const TICKETS: TicketRow[] = [
  { id: '1', number: 'SD-2026-000067', title: 'Acesso ao VPN recusado após reset', type: 'INCIDENT', status: 'OPEN', priority: 'HIGH', requester: { name: 'Gustavo Lima', initials: 'GL' }, createdAt: '2026-09-08T09:12:00' },
  { id: '2', number: 'SD-2026-000065', title: 'Solicitação de novo notebook', type: 'SERVICE_REQUEST', status: 'WAITING_APPROVAL', priority: 'MEDIUM', requester: { name: 'Ana Souza', initials: 'AS' }, createdAt: '2026-09-07T15:40:00' },
  { id: '3', number: 'SD-2026-000064', title: 'Email corporativo sem sincronizar', type: 'INCIDENT', status: 'IN_PROGRESS', priority: 'MEDIUM', requester: { name: 'Bruno Costa', initials: 'BC' }, createdAt: '2026-09-07T11:05:00' },
  { id: '4', number: 'SD-2026-000061', title: 'Notebook com lentidão extrema', type: 'INCIDENT', status: 'IN_PROGRESS', priority: 'CRITICAL', requester: { name: 'Mariana Pires', initials: 'MP' }, createdAt: '2026-09-06T18:22:00' },
  { id: '5', number: 'SD-2026-000058', title: 'Instalação do pacote Office', type: 'SERVICE_REQUEST', status: 'RESOLVED', priority: 'LOW', requester: { name: 'Carlos Dias', initials: 'CD' }, createdAt: '2026-09-05T14:03:00' },
  { id: '6', number: 'SD-2026-000055', title: 'Falha ao imprimir em rede', type: 'INCIDENT', status: 'CLOSED', priority: 'LOW', requester: { name: 'Fernanda Reis', initials: 'FR' }, createdAt: '2026-09-04T10:31:00' },
]

const WEEK_BARS = [38, 52, 44, 67, 58, 80, 72]

const WEEK_LABELS = WEEK_BARS.map((_, index) =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(new Date(Date.now() - (WEEK_BARS.length - 1 - index) * 86_400_000))
    .replace('.', ''),
)

const PRIORITY_DIST = [
  { label: 'CRITICAL', value: 4, tone: 'error' },
  { label: 'HIGH', value: 11, tone: 'warning' },
  { label: 'MEDIUM', value: 22, tone: 'info' },
  { label: 'LOW', value: 9, tone: 'neutral' },
]

interface Metric {
  label: string
  value: string | number
  icon: LucideIcon
  iconClass: string
  delta: string
  trend: 'up' | 'down'
}

const METRICS: Metric[] = [
  { label: 'Tickets abertos', value: 28, icon: Inbox, iconClass: 'bg-primary/10 text-primary', delta: '+12% vs semana', trend: 'up' },
  { label: 'Em andamento', value: 11, icon: Clock, iconClass: 'bg-amber-500/10 text-warning', delta: '+3 nesta semana', trend: 'up' },
  { label: 'Resolvidos', value: 46, icon: CheckCircle2, iconClass: 'bg-emerald-500/10 text-success', delta: '+18% vs mês', trend: 'up' },
  { label: 'Tempo médio (SLA)', value: '1h 24m', icon: Timer, iconClass: 'bg-sky-500/10 text-info', delta: '-8% vs mês', trend: 'down' },
]

function MetricCard({ metric }: { metric: Metric }) {
  const { t } = useTranslation()
  const Icon = metric.icon
  return (
    <Card className="group relative overflow-hidden">
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
      <div className="mt-4 flex items-center gap-1.5 text-xs">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-medium',
            metric.trend === 'up' ? 'text-success' : 'text-error',
          )}
        >
          {metric.trend === 'up' ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          {metric.delta}
        </span>
        <span className="text-bodystroke">{t('nav.dashboard')}</span>
      </div>
    </Card>
  )
}

const TYPE_TONE: Record<string, BadgeTone> = {
  INCIDENT: 'warning',
  SERVICE_REQUEST: 'primary',
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useState<string | null>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sorted = useMemo(() => {
    if (!sortBy) return TICKETS
    return [...TICKETS].sort((a, b) => {
      const aV = a[sortBy as keyof TicketRow] as string
      const bV = b[sortBy as keyof TicketRow] as string
      const result = aV.localeCompare(bV)
      return sortDirection === 'asc' ? result : -result
    })
  }, [sortBy, sortDirection])

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

  const columns: Array<Column<TicketRow>> = [
    {
      key: 'number',
      header: t('nav.tickets'),
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-graydark dark:text-white">{row.title}</span>
          <span className="text-xs tabular-nums text-bodystroke">{row.number}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (row) => (
        <Badge tone={TYPE_TONE[row.type]}>{t(`domain.type.${row.type}`)}</Badge>
      ),
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
      header: 'Prioridade',
      sortable: true,
      render: (row) => (
        <Badge tone={PRIORITY_TONE[row.priority]}>{t(`domain.priority.${row.priority}`)}</Badge>
      ),
    },
    {
      key: 'requester',
      header: 'Solicitante',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.requester.name} size="sm" />
          <span className="text-sm text-body dark:text-bodydark">{row.requester.name}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Criado',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums text-body dark:text-bodydark">{formatDate(row.createdAt)}</span>
      ),
    },
  ]

  const maxPriorities = Math.max(...PRIORITY_DIST.map((p) => p.value))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('app.tagline')}
          </h1>
          <p className="text-sm text-bodystroke">
            {t('nav.dashboard')} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2">
          <TrendingUp className="size-4 text-primary" />
          <span className="text-sm font-medium text-primary">SLA 96,2%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card
          title="Tickets recentes"
          subtitle={`${sorted.length} registros`}
          actions={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ListFilter className="size-3.5" />
              Filtrar
            </button>
          }
          className="xl:col-span-2"
          bodyClassName="px-0 pb-0"
        >
          <Table<TicketRow>
            columns={columns}
            rows={sorted}
            keyFor={(row) => row.id}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </Card>

        <div className="flex flex-col gap-5">
          <Card
            title="Prioridades"
            subtitle="Tickets abertos por severidade"
            bodyClassName="flex flex-col gap-3.5"
          >
            {PRIORITY_DIST.map((item) => (
              <ProgressRow key={item.label} label={item.label} value={item.value} max={maxPriorities} tone={item.tone} />
            ))}
          </Card>

          <Card title="Atividade da semana" subtitle="Tickets criados por dia" bodyClassName="flex items-end gap-2">
            {WEEK_BARS.map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-full rounded-md bg-gradient-to-t from-primary to-primary-light transition-all hover:from-primary-dark',
                    index === WEEK_BARS.length - 1 && 'from-primary-dark to-accent ring-1 ring-primary/40',
                  )}
                  style={{ height: `${height}px` }}
                  title={`${height} tickets`}
                />
                <span className="text-[10px] tabular-nums text-bodystroke">{WEEK_LABELS[index]}</span>
              </div>
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
  const { t } = useTranslation()
  const percentage = Math.round((value / max) * 100)
  const barTone: Record<string, string> = {
    error: 'bg-error',
    warning: 'bg-warning',
    info: 'bg-info',
    neutral: 'bg-bodystroke',
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-graydark dark:text-white">{t(`domain.priority.${label}`)}</span>
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