import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bug, GitPullRequest, Pencil } from 'lucide-react'

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
import { useProblem, useUpdateProblem, useCreateChange } from '@/hooks/useProblemsChanges'
import { PRIORITY_TONE, STATUS_TONE } from '@/lib/domain'
import type { ProblemDetail } from '@/types/problem-change'

const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const IMPACT_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  const { data: problem, isLoading, isError } = useProblem(id)
  const updateProblem = useUpdateProblem()
  const createChange = useCreateChange()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    impact: 'MEDIUM',
    status: 'OPEN',
    rootCause: '',
    workaround: '',
    solution: '',
  })
  const [saving, setSaving] = useState(false)

  const [proposeModalOpen, setProposeModalOpen] = useState(false)
  const [proposeForm, setProposeForm] = useState({
    title: '',
    description: '',
    type: 'NORMAL',
    risk: 'MEDIUM',
    reason: '',
    plan: '',
    rollbackPlan: '',
  })

  const openEdit = (p: ProblemDetail) => {
    setEditForm({
      title: p.title,
      description: p.description,
      impact: p.impact,
      status: p.status,
      rootCause: p.rootCause ?? '',
      workaround: p.workaround ?? '',
      solution: p.solution ?? '',
    })
    setEditModalOpen(true)
  }

  const handleEdit = async () => {
    if (!id) return
    setSaving(true)
    try {
      await updateProblem.mutateAsync({
        id,
        ...editForm,
        rootCause: editForm.rootCause || undefined,
        workaround: editForm.workaround || undefined,
        solution: editForm.solution || undefined,
      })
      toast.success(t('admin.saved'))
      setEditModalOpen(false)
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleProposeChange = async () => {
    if (!id) return
    if (
      proposeForm.title.trim().length < 3 ||
      proposeForm.reason.trim().length < 3 ||
      proposeForm.plan.trim().length < 3 ||
      proposeForm.rollbackPlan.trim().length < 3
    ) {
      toast.error(t('tickets.createError'))
      return
    }
    setSaving(true)
    try {
      await createChange.mutateAsync({
        title: proposeForm.title.trim(),
        description: proposeForm.description.trim(),
        type: proposeForm.type,
        risk: proposeForm.risk,
        reason: proposeForm.reason.trim(),
        plan: proposeForm.plan.trim(),
        rollbackPlan: proposeForm.rollbackPlan.trim(),
      })
      toast.success(t('admin.saved'))
      setProposeModalOpen(false)
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const ticketColumns: Array<Column<ProblemDetail['linkedTickets'][0]>> = useMemo(
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
          <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} dot>
            {t(`domain.status.${row.status}`)}
          </Badge>
        ),
      },
      {
        key: 'priority',
        header: t('dashboard.priority'),
        render: (row) => (
          <Badge tone={PRIORITY_TONE[row.priority] ?? 'neutral'}>
            {t(`domain.priority.${row.priority}`)}
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
  if (isError || !problem)
    return (
      <EmptyState
        icon={<Bug className="size-6 text-error" />}
        title={t('common.error')}
        description={t('tickets.loadError')}
        action={
          <Link to="/problems">
            <Button variant="secondary">{t('tickets.backToList')}</Button>
          </Link>
        }
      />
    )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          to="/problems"
          className="rounded-lg p-2 text-bodystroke hover:bg-graylight hover:text-primary dark:hover:bg-boxdark-2"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
              {problem.title}
            </h1>
            <Badge tone={STATUS_TONE[problem.status] ?? 'neutral'} dot>
              {t(`domain.status.${problem.status}`)}
            </Badge>
            <Badge tone={PRIORITY_TONE[problem.impact] ?? 'neutral'}>
              {t(`domain.priority.${problem.impact}`)}
            </Badge>
          </div>
          <p className="text-sm text-bodystroke">{problem.description}</p>
        </div>
        <Button variant="secondary" onClick={() => openEdit(problem)}>
          <Pencil className="size-4" />
          {t('common.edit')}
        </Button>
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
                  {problem.company?.name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-bodystroke">{t('dashboard.created')}</dt>
                <dd className="text-sm text-body dark:text-bodydark">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(problem.createdAt))}
                </dd>
              </div>
              {problem.rootCause && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-bodystroke">{t('problems.rootCause')}</dt>
                  <dd className="text-sm text-body dark:text-bodydark">{problem.rootCause}</dd>
                </div>
              )}
              {problem.workaround && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-bodystroke">{t('problems.workaround')}</dt>
                  <dd className="text-sm text-body dark:text-bodydark">{problem.workaround}</dd>
                </div>
              )}
              {problem.solution && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-bodystroke">{t('problems.solution')}</dt>
                  <dd className="text-sm text-body dark:text-bodydark">{problem.solution}</dd>
                </div>
              )}
            </dl>
          </Card>

          {problem.linkedTickets.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-graydark dark:text-white">
                {t('tickets.linkedTickets')} ({problem.linkedTickets.length})
              </h3>
              <Table
                columns={ticketColumns}
                rows={problem.linkedTickets}
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
              {t('problems.actions')}
            </h3>
            <Button variant="secondary" onClick={() => setProposeModalOpen(true)}>
              <GitPullRequest className="size-4" />
              {t('problems.proposeChange')}
            </Button>
          </Card>

          {problem.recurrence.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-graydark dark:text-white">
                {t('problems.recurrence')}
              </h3>
              <div className="flex flex-col gap-2">
                {problem.recurrence.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-body dark:text-bodydark line-clamp-1">{r.title}</span>
                    <Badge tone="neutral">{r.count}x</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={editModalOpen}
        title={t('admin.editProblem')}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('common.status')}>
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                {STATUS_ORDER.map((v) => (
                  <option key={v} value={v}>
                    {t(`domain.status.${v}`)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('tickets.impact')}>
              <Select
                value={editForm.impact}
                onChange={(e) => setEditForm({ ...editForm, impact: e.target.value })}
              >
                {IMPACT_ORDER.map((v) => (
                  <option key={v} value={v}>
                    {t(`domain.priority.${v}`)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label={t('problems.rootCause')}>
            <Textarea
              value={editForm.rootCause}
              onChange={(e) => setEditForm({ ...editForm, rootCause: e.target.value })}
              rows={2}
              maxLength={2000}
            />
          </FormField>
          <FormField label={t('problems.workaround')}>
            <Textarea
              value={editForm.workaround}
              onChange={(e) => setEditForm({ ...editForm, workaround: e.target.value })}
              rows={2}
              maxLength={2000}
            />
          </FormField>
          <FormField label={t('problems.solution')}>
            <Textarea
              value={editForm.solution}
              onChange={(e) => setEditForm({ ...editForm, solution: e.target.value })}
              rows={2}
              maxLength={2000}
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={proposeModalOpen}
        title={t('problems.proposeChange')}
        onClose={() => setProposeModalOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setProposeModalOpen(false)}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleProposeChange()} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('tickets.titleField')} required>
            <Input
              value={proposeForm.title}
              onChange={(e) => setProposeForm({ ...proposeForm, title: e.target.value })}
              maxLength={120}
            />
          </FormField>
          <FormField label={t('tickets.descriptionField')}>
            <Textarea
              value={proposeForm.description}
              onChange={(e) => setProposeForm({ ...proposeForm, description: e.target.value })}
              rows={2}
              maxLength={4000}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('tickets.typeField')}>
              <Select
                value={proposeForm.type}
                onChange={(e) => setProposeForm({ ...proposeForm, type: e.target.value })}
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
                value={proposeForm.risk}
                onChange={(e) => setProposeForm({ ...proposeForm, risk: e.target.value })}
              >
                {['LOW', 'MEDIUM', 'HIGH'].map((v) => (
                  <option key={v} value={v}>
                    {t(`domain.priority.${v}`)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label={t('changes.reason')} required>
            <Textarea
              value={proposeForm.reason}
              onChange={(e) => setProposeForm({ ...proposeForm, reason: e.target.value })}
              rows={2}
              maxLength={2000}
            />
          </FormField>
          <FormField label={t('changes.plan')} required>
            <Textarea
              value={proposeForm.plan}
              onChange={(e) => setProposeForm({ ...proposeForm, plan: e.target.value })}
              rows={3}
              maxLength={4000}
            />
          </FormField>
          <FormField label={t('changes.rollbackPlan')} required>
            <Textarea
              value={proposeForm.rollbackPlan}
              onChange={(e) => setProposeForm({ ...proposeForm, rollbackPlan: e.target.value })}
              rows={3}
              maxLength={4000}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
