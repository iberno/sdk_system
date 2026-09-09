import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, ScrollText } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, type Column } from '@/components/ui/Table'
import { useAuditLogs } from '@/hooks/useAdmin'
import type { AuditLogEntry } from '@/types/admin'

const ENTITIES = [
  'Ticket',
  'User',
  'Company',
  'SolverGroup',
  'RoutingRule',
  'SLAPolicy',
  'ApprovalFlow',
  'Approval',
  'KnowledgeArticle',
  'Change',
  'Problem',
]

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'COMMENT', 'LOGIN', 'LOGOUT']

const ACTION_TONE: Record<
  string,
  'success' | 'info' | 'error' | 'primary' | 'warning' | 'neutral'
> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  COMMENT: 'primary',
  LOGIN: 'success',
  LOGOUT: 'neutral',
}

const shortId = (id: string) => `${id.slice(0, 8)}…`

const summarize = (entry: AuditLogEntry) => {
  const source = entry.newData ?? entry.oldData
  if (!source) return '—'
  const keys = Object.keys(source)
  if (keys.length === 0) return '—'
  const first = keys[0]
  const value = String(source[first] ?? '')
  return keys.length === 1 ? `${first}: ${value}` : `${first}: ${value} (+${keys.length - 1})`
}

export default function AuditAdminPage() {
  const { t } = useTranslation()

  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<AuditLogEntry | null>(null)

  useEffect(() => {
    setPage(1)
  }, [entity, action, startDate, endDate])

  const { data, isLoading, isError, refetch } = useAuditLogs({
    page,
    pageSize: 15,
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    ...(startDate ? { startDate: `${startDate}T00:00:00.000Z` } : {}),
    ...(endDate ? { endDate: `${endDate}T23:59:59.999Z` } : {}),
  })

  const columns: Array<Column<AuditLogEntry>> = useMemo(() => {
    const formatDateTime = (iso: string) =>
      new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      )
    return [
      {
        key: 'createdAt',
        header: t('audit.when'),
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">
            {formatDateTime(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'user',
        header: t('admin.name'),
        render: (row) =>
          row.user ? (
            <div className="flex items-center gap-2.5">
              <Avatar name={row.user.name} size="sm" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-graydark dark:text-white">
                  {row.user.name}
                </span>
                <span className="text-xs text-bodystroke">{row.user.email}</span>
              </div>
            </div>
          ) : (
            <span className="text-bodystroke">—</span>
          ),
      },
      {
        key: 'action',
        header: t('audit.action'),
        render: (row) => <Badge tone={ACTION_TONE[row.action] ?? 'neutral'}>{row.action}</Badge>,
      },
      {
        key: 'entity',
        header: t('audit.entity'),
        render: (row) => <Badge tone="primary">{row.entity}</Badge>,
      },
      {
        key: 'entityId',
        header: t('audit.entityId'),
        render: (row) => (
          <span className="font-mono text-xs text-body dark:text-bodydark">
            {row.entityId ? shortId(row.entityId) : '—'}
          </span>
        ),
      },
      {
        key: 'summary',
        header: t('audit.summary'),
        render: (row) => (
          <span className="block max-w-56 truncate text-sm text-body dark:text-bodydark">
            {summarize(row)}
          </span>
        ),
      },
      {
        key: 'ip',
        header: 'IP',
        render: (row) => (
          <span className="font-mono text-xs text-body dark:text-bodydark">{row.ip ?? '—'}</span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (row) => (
          <button
            type="button"
            onClick={() => setDetail(row)}
            title={t('common.view')}
            className="rounded-lg p-2 text-bodystroke transition-colors hover:bg-graylight hover:text-primary dark:hover:bg-boxdark-2"
          >
            <Eye className="size-4" />
          </button>
        ),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  const pagination = data?.pagination

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
          {t('nav.audit')}
        </h2>
        <p className="text-sm text-bodystroke">{t('audit.subtitle')}</p>
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<ScrollText className="size-6 text-error" />}
            title={t('common.error')}
            description={t('tickets.loadError')}
            action={
              <Button variant="secondary" onClick={() => void refetch()}>
                {t('common.retry')}
              </Button>
            }
          />
        </Card>
      )}

      <Card bodyClassName="p-0">
        <div className="grid grid-cols-1 gap-3 border-b border-stroke p-4 dark:border-strokedark sm:grid-cols-2 lg:grid-cols-4">
          <Select value={entity} onChange={(event) => setEntity(event.target.value)}>
            <option value="">
              {t('common.all')} · {t('audit.entity')}
            </option>
            {ENTITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Select value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="">
              {t('common.all')} · {t('audit.action')}
            </option>
            {ACTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            aria-label={t('audit.startDate')}
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            aria-label={t('audit.endDate')}
          />
        </div>

        <Table<AuditLogEntry>
          columns={columns}
          rows={data?.items ?? []}
          keyFor={(row) => row.id}
          loading={isLoading}
          empty={t('common.empty')}
        />

        <div className="border-t border-stroke p-4 dark:border-strokedark">
          {isLoading ? (
            <Skeleton className="h-8 w-56" />
          ) : (
            <Pagination
              page={page}
              totalPages={pagination?.totalPages ?? 1}
              totalItems={pagination?.totalItems ?? 0}
              onChange={setPage}
              onPreviousLabel={t('common.previous')}
              onNextLabel={t('common.next')}
              infoLabel={t('tickets.pageOf')}
            />
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(detail)}
        title={t('audit.detailTitle')}
        onClose={() => setDetail(null)}
        size="lg"
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={ACTION_TONE[detail.action] ?? 'neutral'}>{detail.action}</Badge>
              <Badge tone="primary">{detail.entity}</Badge>
              <Badge tone="neutral">{t('audit.byUser', { name: detail.user?.name ?? '—' })}</Badge>
              {detail.ip && <Badge tone="neutral">IP {detail.ip}</Badge>}
            </div>
            {detail.userAgent && (
              <p className="break-all font-mono text-xs text-bodystroke">{detail.userAgent}</p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-bodystroke">
                  {t('audit.before')}
                </p>
                <pre className="max-h-64 overflow-auto rounded-lg bg-graylight p-3 font-mono text-xs text-body dark:bg-boxdark-3 dark:text-bodydark">
                  {detail.oldData ? JSON.stringify(detail.oldData, null, 2) : '—'}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-bodystroke">
                  {t('audit.after')}
                </p>
                <pre className="max-h-64 overflow-auto rounded-lg bg-graylight p-3 font-mono text-xs text-body dark:bg-boxdark-3 dark:text-bodydark">
                  {detail.newData ? JSON.stringify(detail.newData, null, 2) : '—'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
