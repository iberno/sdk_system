import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, BarChart3, CheckCircle2, Clock, Inbox, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useDashboardSummary } from '@/hooks/useDashboard'
import type { DashboardSummary } from '@/hooks/useDashboard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

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
const TYPE_ORDER = ['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'PROBLEM'] as const

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#e03131',
  HIGH: '#e8912d',
  MEDIUM: '#0082fb',
  LOW: '#93a4b0',
}

interface Metric {
  label: string
  value: string
  icon: LucideIcon
  iconClass: string
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-bodystroke">{metric.label}</span>
          <span className="text-xl font-semibold tabular-nums tracking-tight text-graydark dark:text-white">
            {metric.value}
          </span>
        </div>
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            metric.iconClass,
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </div>
    </Card>
  )
}

function MetricSkeleton() {
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </Card>
  )
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
    new Date(`${iso}T00:00:00`),
  )

function TrendChart({ trend }: { trend: DashboardSummary['trend'] }) {
  const W = 640
  const H = 220
  const PAD = { top: 14, right: 14, bottom: 30, left: 38 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  if (trend.length === 0) return null

  const max = Math.max(1, ...trend.flatMap((d) => [d.created, d.resolved]))
  const niceMax = Math.ceil(max / 5) * 5
  const x = (i: number) =>
    PAD.left + (trend.length <= 1 ? innerW / 2 : (i / (trend.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / niceMax) * innerH

  const line = (key: 'created' | 'resolved') =>
    trend
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`)
      .join(' ')

  const createdPath = line('created')
  const resolvedPath = line('resolved')
  const areaPath = `${createdPath} L${x(trend.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`

  const labelEvery = Math.max(1, Math.ceil(trend.length / 6))

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label="tendência">
        {[0, 0.5, 1].map((f) => {
          const gy = PAD.top + innerH - f * innerH
          const value = Math.round(f * niceMax)
          return (
            <g key={f}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={gy}
                y2={gy}
                stroke="currentColor"
                className="text-stroke/80 dark:text-strokedark"
                strokeDasharray={f === 0 ? undefined : '3 4'}
              />
              <text
                x={PAD.left - 8}
                y={gy + 3.5}
                textAnchor="end"
                className="fill-bodystroke text-[10px] tabular-nums"
              >
                {value}
              </text>
            </g>
          )
        })}
        {trend.map((d, i) =>
          i % labelEvery === 0 || i === trend.length - 1 ? (
            <text
              key={d.date}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-bodystroke text-[10px] tabular-nums"
            >
              {shortDate(d.date)}
            </text>
          ) : null,
        )}
        <path d={areaPath} fill="#0082fb" opacity={0.08} />
        <path
          d={createdPath}
          fill="none"
          stroke="#0082fb"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={resolvedPath}
          fill="none"
          stroke="#23a55a"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

function DonutChart({
  data,
  colors,
  labels,
}: {
  data: Array<{ key: string; value: number }>
  colors: Record<string, string>
  labels: (key: string) => string
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  if (total === 0) return null

  const R = 40
  const C = 2 * Math.PI * R
  const segments = data.map((d) => ({ ...d, len: (d.value / total) * C }))

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 100 100" className="size-36 shrink-0" role="img" aria-label="distribuição">
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          className="text-stroke/70 dark:text-strokedark"
        />
        {segments.map((d, index) => (
          <circle
            key={d.key}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={colors[d.key] ?? '#93a4b0'}
            strokeWidth="14"
            strokeDasharray={`${d.len} ${C - d.len}`}
            strokeDashoffset={-segments.slice(0, index).reduce((acc, s) => acc + s.len, 0)}
            transform="rotate(-90 50 50)"
          />
        ))}
      </svg>
      <ul className="flex w-full flex-col gap-1.5 sm:w-auto">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-2 font-medium text-graydark dark:text-white">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colors[d.key] ?? '#93a4b0' }}
              />
              {labels(d.key)}
            </span>
            <span className="tabular-nums text-bodystroke">
              {d.value} · {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BarList({
  data,
  color,
}: {
  data: Array<{ label: string; value: number }>
  color: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  if (data.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate font-medium text-graydark dark:text-white">{d.label}</span>
            <span className="shrink-0 tabular-nums text-bodystroke">{d.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-stroke/80 dark:bg-strokedark">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round((d.value / max) * 100)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useDashboardSummary()

  const sortedPriority = useMemo(
    () =>
      PRIORITY_ORDER.map((key) => ({ key, value: data?.byPriority[key] ?? 0 })).filter(
        (d) => d.value > 0,
      ),
    [data],
  )
  const sortedStatus = useMemo(
    () =>
      STATUS_ORDER.map((key) => ({ key, value: data?.byStatus[key] ?? 0 })).filter(
        (d) => d.value > 0,
      ),
    [data],
  )
  const sortedType = useMemo(
    () =>
      TYPE_ORDER.map((key) => ({ key, value: data?.byType[key] ?? 0 })).filter((d) => d.value > 0),
    [data],
  )
  const sortedGroups = useMemo(
    () =>
      [...(data?.byGroup ?? [])]
        .sort((a, b) => b.count - a.count)
        .map((g) => ({ label: g.group, value: g.count })),
    [data],
  )

  const metrics: Metric[] = [
    {
      label: t('reports.open'),
      value: String(data?.totals.openTickets ?? 0),
      icon: Inbox,
      iconClass: 'bg-primary/10 text-primary',
    },
    {
      label: t('reports.inProgress'),
      value: String(data?.totals.inProgress ?? 0),
      icon: Clock,
      iconClass: 'bg-amber-500/10 text-warning',
    },
    {
      label: t('reports.resolved'),
      value: String(data?.totals.resolved ?? 0),
      icon: CheckCircle2,
      iconClass: 'bg-emerald-500/10 text-success',
    },
    {
      label: t('reports.breached'),
      value: String(data?.totals.slaBreached ?? 0),
      icon: AlertTriangle,
      iconClass: 'bg-red-500/10 text-error',
    },
    {
      label: t('reports.avgFirstResponse'),
      value: formatDuration(data?.totals.avgFirstResponseMin ?? 0),
      icon: Timer,
      iconClass: 'bg-sky-500/10 text-info',
    },
    {
      label: t('reports.avgResolution'),
      value: `${data?.totals.avgResolutionHours ?? 0}h`,
      icon: BarChart3,
      iconClass: 'bg-violet-500/10 text-primary',
    },
  ]

  const periodLabel = data ? `${shortDate(data.period.start)} – ${shortDate(data.period.end)}` : ''

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
          {t('nav.reports')}
        </h1>
        <p className="text-sm text-bodystroke">{data ? periodLabel : t('common.loading')}</p>
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<BarChart3 className="size-6 text-error" />}
            title={t('common.error')}
            description={t('reports.loadError')}
            action={
              <Button variant="secondary" onClick={() => void refetch()}>
                {t('common.retry')}
              </Button>
            }
          />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <MetricSkeleton key={index} />)
          : metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card
          title={t('reports.trend')}
          subtitle={t('reports.trendSub')}
          className="xl:col-span-2"
          bodyClassName="flex flex-col gap-3"
        >
          <div className="flex items-center gap-4 text-xs text-bodystroke">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#0082fb]" />
              {t('reports.created')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#23a55a]" />
              {t('reports.resolved')}
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : data && data.trend.length > 0 ? (
            <TrendChart trend={data.trend} />
          ) : (
            <div className="flex h-56 items-center justify-center text-sm text-bodystroke">
              {t('reports.noData')}
            </div>
          )}
        </Card>

        <Card title={t('reports.byPriority')} bodyClassName="flex flex-col gap-4">
          {isLoading ? (
            <Skeleton className="h-36 w-full rounded-lg" />
          ) : data && sortedPriority.length > 0 ? (
            <DonutChart
              data={sortedPriority}
              colors={PRIORITY_COLORS}
              labels={(key) => t(`domain.priority.${key}`)}
            />
          ) : (
            <div className="flex h-36 items-center justify-center text-sm text-bodystroke">
              {t('reports.noData')}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title={t('reports.byGroup')} bodyClassName="flex flex-col gap-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : data && sortedGroups.length > 0 ? (
            <BarList data={sortedGroups} color="#0082fb" />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-bodystroke">
              {t('reports.noData')}
            </div>
          )}
        </Card>

        <Card title={t('reports.byStatus')} bodyClassName="flex flex-col gap-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : data && sortedStatus.length > 0 ? (
            <BarList
              data={sortedStatus.map((d) => ({
                label: t(`domain.status.${d.key}`),
                value: d.value,
              }))}
              color="#0082fb"
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-bodystroke">
              {t('reports.noData')}
            </div>
          )}
        </Card>

        <Card title={t('reports.byType')} bodyClassName="flex flex-col gap-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : data && sortedType.length > 0 ? (
            <BarList
              data={sortedType.map((d) => ({ label: t(`domain.type.${d.key}`), value: d.value }))}
              color="#23a55a"
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-bodystroke">
              {t('reports.noData')}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
