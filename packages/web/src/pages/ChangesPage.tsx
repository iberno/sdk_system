import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitPullRequest, Plus, Search } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, type Column } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/toast-store'
import {
  useChanges,
  useCreateChange,
  useSubmitChange,
  useExecuteChange,
  useRollbackChange,
} from '@/hooks/useProblemsChanges'
import type { ChangeListItem } from '@/types/problem-change'

const STATUS_ORDER = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'ROLLED_BACK',
]
const TYPE_ORDER = ['STANDARD', 'NORMAL', 'EMERGENCY']
const RISK_ORDER = ['LOW', 'MEDIUM', 'HIGH']

const STATUS_TONE: Record<string, 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  REJECTED: 'error',
  SCHEDULED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  ROLLED_BACK: 'error',
}

export default function ChangesPage() {
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'NORMAL',
    risk: 'MEDIUM',
    reason: '',
    plan: '',
    rollbackPlan: '',
  })
  const [saving, setSaving] = useState(false)

  const { data, isLoading, isError, refetch } = useChanges({
    page,
    pageSize: 10,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  })

  const createChange = useCreateChange()
  const submitChange = useSubmitChange()
  const executeChange = useExecuteChange()
  const rollbackChange = useRollbackChange()

  const openCreate = () => {
    setForm({
      title: '',
      description: '',
      type: 'NORMAL',
      risk: 'MEDIUM',
      reason: '',
      plan: '',
      rollbackPlan: '',
    })
    setModalOpen(true)
  }

  const handleCreate = async () => {
    if (
      form.title.trim().length < 3 ||
      form.description.trim().length < 3 ||
      form.reason.trim().length < 3 ||
      form.plan.trim().length < 3 ||
      form.rollbackPlan.trim().length < 3
    ) {
      toast.error(t('tickets.createError'))
      return
    }
    setSaving(true)
    try {
      await createChange.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        risk: form.risk,
        reason: form.reason.trim(),
        plan: form.plan.trim(),
        rollbackPlan: form.rollbackPlan.trim(),
      })
      toast.success(t('admin.saved'))
      setModalOpen(false)
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (action: 'submit' | 'execute' | 'rollback', id: string) => {
    try {
      if (action === 'submit') await submitChange.mutateAsync(id)
      else if (action === 'execute') await executeChange.mutateAsync(id)
      else await rollbackChange.mutateAsync(id)
      toast.success(t('admin.saved'))
    } catch {
      toast.error(t('admin.saveError'))
    }
  }

  const columns: Array<Column<ChangeListItem>> = useMemo(() => {
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }).format(new Date(iso))
    return [
      {
        key: 'title',
        header: t('common.title'),
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-graydark dark:text-white">{row.title}</span>
            <span className="text-xs text-bodystroke line-clamp-1">{row.description}</span>
          </div>
        ),
      },
      {
        key: 'type',
        header: t('tickets.typeField'),
        render: (row) => <Badge tone="info">{t(`domain.changeType.${row.type}`)}</Badge>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (row) => (
          <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} dot>
            {t(`domain.changeStatus.${row.status}`)}
          </Badge>
        ),
      },
      {
        key: 'risk',
        header: t('tickets.risk'),
        render: (row) => (
          <Badge
            tone={row.risk === 'HIGH' ? 'error' : row.risk === 'MEDIUM' ? 'warning' : 'neutral'}
          >
            {t(`domain.priority.${row.risk}`)}
          </Badge>
        ),
      },
      {
        key: 'approvals',
        header: t('tickets.approvals'),
        render: (row) => {
          const approvals = row.approvals ?? []
          const approved = approvals.filter((a) => a.status === 'APPROVED').length
          const total = approvals.length
          return total > 0 ? (
            <span className="text-sm tabular-nums text-body dark:text-bodydark">
              {approved}/{total}
            </span>
          ) : (
            <span className="text-bodystroke">—</span>
          )
        },
      },
      {
        key: 'createdAt',
        header: t('dashboard.created'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">
            {formatDate(row.createdAt)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            {row.status === 'DRAFT' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleAction('submit', row.id)}
              >
                {t('changes.submit')}
              </Button>
            )}
            {row.status === 'APPROVED' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleAction('execute', row.id)}
              >
                {t('changes.execute')}
              </Button>
            )}
            {row.status === 'IN_PROGRESS' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => void handleAction('rollback', row.id)}
              >
                {t('changes.rollback')}
              </Button>
            )}
          </div>
        ),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('nav.changes')}
          </h2>
          <p className="text-sm text-bodystroke">{t('admin.changesSubtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {t('admin.newChange')}
        </Button>
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<GitPullRequest className="size-6 text-error" />}
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
        <div className="grid grid-cols-1 gap-3 border-b border-stroke p-4 dark:border-strokedark sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-bodystroke" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder={t('tickets.searchPlaceholder')}
              className="pl-10"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">
              {t('common.all')} · {t('common.status')}
            </option>
            {STATUS_ORDER.map((v) => (
              <option key={v} value={v}>
                {t(`domain.changeStatus.${v}`)}
              </option>
            ))}
          </Select>
          <Select
            value={type}
            onChange={(event) => {
              setType(event.target.value)
              setPage(1)
            }}
          >
            <option value="">
              {t('common.all')} · {t('tickets.typeField')}
            </option>
            {TYPE_ORDER.map((v) => (
              <option key={v} value={v}>
                {t(`domain.changeType.${v}`)}
              </option>
            ))}
          </Select>
        </div>

        <Table<ChangeListItem>
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
              totalPages={data?.pagination?.totalPages ?? 1}
              totalItems={data?.pagination?.totalItems ?? 0}
              onChange={setPage}
              onPreviousLabel={t('common.previous')}
              onNextLabel={t('common.next')}
              infoLabel={t('tickets.pageOf')}
            />
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={t('admin.newChange')}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleCreate()} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('tickets.titleField')} required>
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              maxLength={120}
            />
          </FormField>

          <FormField label={t('tickets.descriptionField')} required>
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              maxLength={4000}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('tickets.typeField')}>
              <Select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                {TYPE_ORDER.map((v) => (
                  <option key={v} value={v}>
                    {t(`domain.changeType.${v}`)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('tickets.risk')}>
              <Select
                value={form.risk}
                onChange={(event) => setForm({ ...form, risk: event.target.value })}
              >
                {RISK_ORDER.map((v) => (
                  <option key={v} value={v}>
                    {t(`domain.priority.${v}`)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label={t('changes.reason')} required>
            <Textarea
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
              rows={2}
              maxLength={2000}
            />
          </FormField>

          <FormField label={t('changes.plan')} required>
            <Textarea
              value={form.plan}
              onChange={(event) => setForm({ ...form, plan: event.target.value })}
              rows={3}
              maxLength={4000}
            />
          </FormField>

          <FormField label={t('changes.rollbackPlan')} required>
            <Textarea
              value={form.rollbackPlan}
              onChange={(event) => setForm({ ...form, rollbackPlan: event.target.value })}
              rows={3}
              maxLength={4000}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
