import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, GitPullRequest, Pencil, Play, RotateCcw, Send } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, type Column } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/toast-store'
import {
  useChange,
  useUpdateChange,
  useSubmitChange,
  useExecuteChange,
  useRollbackChange,
} from '@/hooks/useProblemsChanges'
import type { ChangeDetail } from '@/types/problem-change'

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

export default function ChangeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  const { data: change, isLoading, isError } = useChange(id)
  const updateChange = useUpdateChange()
  const submitChange = useSubmitChange()
  const executeChange = useExecuteChange()
  const rollbackChange = useRollbackChange()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    type: 'NORMAL',
    risk: 'MEDIUM',
    status: 'DRAFT',
    reason: '',
    plan: '',
    rollbackPlan: '',
  })
  const [saving, setSaving] = useState(false)

  const openEdit = (c: ChangeDetail) => {
    setEditForm({
      title: c.title,
      description: c.description,
      type: c.type,
      risk: c.risk,
      status: c.status,
      reason: c.reason,
      plan: c.plan,
      rollbackPlan: c.rollbackPlan,
    })
    setEditModalOpen(true)
  }

  const handleEdit = async () => {
    if (!id) return
    setSaving(true)
    try {
      await updateChange.mutateAsync({ id, ...editForm })
      toast.success(t('admin.saved'))
      setEditModalOpen(false)
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (action: 'submit' | 'execute' | 'rollback') => {
    if (!id) return
    setSaving(true)
    try {
      if (action === 'submit') await submitChange.mutateAsync(id)
      else if (action === 'execute') await executeChange.mutateAsync(id)
      else await rollbackChange.mutateAsync(id)
      toast.success(t('admin.saved'))
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const approvalColumns: Array<Column<ChangeDetail['approvals'][0]>> = useMemo(
    () => [
      {
        key: 'order',
        header: t('tickets.approvals'),
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">#{row.order}</span>
        ),
      },
      {
        key: 'approver',
        header: t('tickets.assignee'),
        render: (row) =>
          row.approver ? (
            <div className="flex items-center gap-2">
              <Avatar name={row.approver.name} size="sm" />
              <span className="text-sm text-body dark:text-bodydark">{row.approver.name}</span>
            </div>
          ) : (
            <span className="text-bodystroke">—</span>
          ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (row) => (
          <Badge
            tone={
              row.status === 'APPROVED'
                ? 'success'
                : row.status === 'REJECTED'
                  ? 'error'
                  : 'warning'
            }
            dot
          >
            {t(`domain.status.${row.status}`)}
          </Badge>
        ),
      },
    ],
    [t],
  )

  const ticketColumns: Array<Column<ChangeDetail['linkedTickets'][0]>> = useMemo(
    () => [
      {
        key: 'ticketNumber',
        header: t('nav.tickets'),
        render: (row) => (
          <Link
            to={`/tickets/${row.id}`}
            className="font-medium text-graydark hover:text-primary dark:text-white dark:hover:text-accent"
          >
            {row.ticketNumber}
          </Link>
        ),
      },
      {
        key: 'title',
        header: t('common.title'),
        render: (row) => (
          <span className="text-sm text-body dark:text-bodydark line-clamp-1">{row.title}</span>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (row) => (
          <Badge tone="neutral" dot>
            {t(`domain.status.${row.status}`)}
          </Badge>
        ),
      },
    ],
    [t],
  )

  if (isLoading)
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (isError || !change)
    return (
      <EmptyState
        icon={<GitPullRequest className="size-6 text-error" />}
        title={t('common.error')}
        description={t('tickets.loadError')}
        action={
          <Link to="/changes">
            <Button variant="secondary">{t('tickets.backToList')}</Button>
          </Link>
        }
      />
    )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          to="/changes"
          className="rounded-lg p-2 text-bodystroke hover:bg-graylight hover:text-primary dark:hover:bg-boxdark-2"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
              {change.title}
            </h1>
            <Badge tone={STATUS_TONE[change.status] ?? 'neutral'} dot>
              {t(`domain.changeStatus.${change.status}`)}
            </Badge>
            <Badge tone="info">{t(`domain.changeType.${change.type}`)}</Badge>
            <Badge
              tone={
                change.risk === 'HIGH' ? 'error' : change.risk === 'MEDIUM' ? 'warning' : 'neutral'
              }
            >
              {t(`domain.priority.${change.risk}`)}
            </Badge>
          </div>
          <p className="text-sm text-bodystroke">{change.description}</p>
        </div>
        <div className="flex gap-2">
          {change.status === 'DRAFT' && (
            <Button onClick={() => void handleAction('submit')}>
              <Send className="size-4" />
              {t('changes.submit')}
            </Button>
          )}
          {change.status === 'APPROVED' && (
            <Button onClick={() => void handleAction('execute')}>
              <Play className="size-4" />
              {t('changes.execute')}
            </Button>
          )}
          {change.status === 'IN_PROGRESS' && (
            <Button variant="danger" onClick={() => void handleAction('rollback')}>
              <RotateCcw className="size-4" />
              {t('changes.rollback')}
            </Button>
          )}
          <Button variant="secondary" onClick={() => openEdit(change)}>
            <Pencil className="size-4" />
            {t('common.edit')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-graydark dark:text-white">
              {t('tickets.details')}
            </h3>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-bodystroke">{t('tickets.companyField')}</dt>
                <dd className="text-sm text-body dark:text-bodydark">
                  {change.company?.name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bodystroke">{t('tickets.requester')}</dt>
                <dd className="text-sm text-body dark:text-bodydark">
                  {change.requester?.name ?? '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-bodystroke">{t('changes.reason')}</dt>
                <dd className="text-sm text-body dark:text-bodydark">{change.reason}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-bodystroke">{t('changes.plan')}</dt>
                <dd className="text-sm text-body dark:text-bodydark whitespace-pre-wrap">
                  {change.plan}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-bodystroke">{t('changes.rollbackPlan')}</dt>
                <dd className="text-sm text-body dark:text-bodydark whitespace-pre-wrap">
                  {change.rollbackPlan}
                </dd>
              </div>
              {change.scheduledAt && (
                <div>
                  <dt className="text-xs text-bodystroke">{t('changes.scheduledAt')}</dt>
                  <dd className="text-sm text-body dark:text-bodydark">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(change.scheduledAt))}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {change.approvals.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-graydark dark:text-white">
                {t('tickets.approvals')} ({change.approvals.length})
              </h3>
              <Table
                columns={approvalColumns}
                rows={change.approvals}
                keyFor={(row) => row.id}
                loading={false}
                empty={t('common.empty')}
              />
            </Card>
          )}

          {change.linkedTickets.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-graydark dark:text-white">
                {t('tickets.linkedTickets')} ({change.linkedTickets.length})
              </h3>
              <Table
                columns={ticketColumns}
                rows={change.linkedTickets}
                keyFor={(row) => row.id}
                loading={false}
                empty={t('common.empty')}
              />
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-graydark dark:text-white">
              {t('tickets.timeline')}
            </h3>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="text-xs text-bodystroke">{t('dashboard.created')}</dt>
                <dd className="text-sm text-body dark:text-bodydark">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(change.createdAt))}
                </dd>
              </div>
              {change.problem && (
                <div>
                  <dt className="text-xs text-bodystroke">{t('nav.problems')}</dt>
                  <dd>
                    <Link
                      to={`/problems/${change.problem.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {change.problem.title}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={editModalOpen}
        title={t('admin.editChange')}
        onClose={() => setEditModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleEdit()} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('tickets.titleField')} required>
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              maxLength={120}
            />
          </FormField>
          <FormField label={t('tickets.descriptionField')} required>
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              maxLength={4000}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label={t('tickets.typeField')}>
              <Select
                value={editForm.type}
                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
              >
                {['STANDARD', 'NORMAL', 'EMERGENCY'].map((v) => (
                  <option key={v} value={v}>
                    {t(`domain.changeType.${v}`)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('tickets.risk')}>
              <Select
                value={editForm.risk}
                onChange={(e) => setEditForm({ ...editForm, risk: e.target.value })}
              >
                {['LOW', 'MEDIUM', 'HIGH'].map((v) => (
                  <option key={v} value={v}>
                    {t(`domain.priority.${v}`)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('common.status')}>
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                {STATUS_ORDER.map((v) => (
                  <option key={v} value={v}>
                    {t(`domain.changeStatus.${v}`)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label={t('changes.reason')} required>
            <Textarea
              value={editForm.reason}
              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              rows={2}
              maxLength={2000}
            />
          </FormField>
          <FormField label={t('changes.plan')} required>
            <Textarea
              value={editForm.plan}
              onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
              rows={3}
              maxLength={4000}
            />
          </FormField>
          <FormField label={t('changes.rollbackPlan')} required>
            <Textarea
              value={editForm.rollbackPlan}
              onChange={(e) => setEditForm({ ...editForm, rollbackPlan: e.target.value })}
              rows={3}
              maxLength={4000}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
