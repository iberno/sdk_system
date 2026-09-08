import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, CheckSquare, Pencil, Plus, Power, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
  useAdminGroups,
  useApprovalFlows,
  useApproverCandidates,
  useCreateApprovalFlow,
  useUpdateApprovalFlow,
  useUpdateApprovalFlowStatus,
} from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { ApprovalFlow, ApprovalStageData } from '@/types/admin'

const ENTITY_TYPES = ['TICKET', 'CHANGE']
const APPROVER_ROLES = ['MANAGER', 'ADMIN', 'AGENT']
const STAGE_TYPES = ['role', 'group', 'user'] as const
type StageType = (typeof STAGE_TYPES)[number]

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PENDING: 'warning',
}

interface StageForm {
  type: StageType
  value: string
}

interface FlowForm {
  name: string
  description: string
  entityType: string
  stages: StageForm[]
}

const emptyStage = (): StageForm => ({ type: 'role', value: 'MANAGER' })

const toStages = (rules: ApprovalFlow['rules']): StageForm[] =>
  (rules?.stages ?? []).map((s: ApprovalStageData) => ({
    type: s.userId ? 'user' : s.solverGroupId ? 'group' : 'role',
    value: s.userId ?? s.solverGroupId ?? s.approverRole ?? '',
  }))

const toRules = (stages: StageForm[]) => ({
  stages: stages.map((s, i) => ({
    order: i + 1,
    ...(s.type === 'role' ? { approverRole: s.value } : {}),
    ...(s.type === 'group' ? { solverGroupId: s.value } : {}),
    ...(s.type === 'user' ? { userId: s.value } : {}),
  })),
})

export default function ApprovalFlowsAdminPage() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((s) => s.user)
  const isManagerOrAdmin =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'

  const { data, isLoading, isError, refetch } = useApprovalFlows()
  const groupsQuery = useAdminGroups()
  const candidatesQuery = useApproverCandidates()
  const createFlow = useCreateApprovalFlow()
  const updateFlow = useUpdateApprovalFlow()
  const updateStatus = useUpdateApprovalFlowStatus()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalFlow | null>(null)
  const [form, setForm] = useState<FlowForm>({
    name: '',
    description: '',
    entityType: 'TICKET',
    stages: [emptyStage()],
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [toggling, setToggling] = useState<ApprovalFlow | null>(null)
  const [saving, setSaving] = useState(false)

  const teamUsers = useMemo(
    () => (candidatesQuery.data ?? []).filter((u) => u.role !== 'USER'),
    [candidatesQuery.data],
  )

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', entityType: 'TICKET', stages: [emptyStage()] })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (flow: ApprovalFlow) => {
    setEditing(flow)
    setForm({
      name: flow.name,
      description: flow.description ?? '',
      entityType: flow.entityType,
      stages: toStages(flow.rules),
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const updateStage = (index: number, patch: Partial<StageForm>) => {
    setForm((prev) => ({
      ...prev,
      stages: prev.stages.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  const moveStage = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.stages.length) return prev
      const next = [...prev.stages]
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...prev, stages: next }
    })
  }

  const submit = async () => {
    const errors: Record<string, string> = {}
    if (form.name.trim().length < 3) errors.name = t('tickets.createError')
    if (form.stages.length === 0) errors.stages = t('admin.flowNeedsStage')
    if (form.stages.some((s) => !s.value)) errors.stages = t('admin.flowStageInvalid')
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        entityType: form.entityType,
        rules: toRules(form.stages),
      }
      if (editing) {
        await updateFlow.mutateAsync({ id: editing.id, ...payload })
        toast.success(t('admin.flowUpdated'))
      } else {
        await createFlow.mutateAsync(payload)
        toast.success(t('admin.flowCreated'))
      }
      setModalOpen(false)
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async () => {
    if (!toggling) return
    const next = toggling.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await updateStatus.mutateAsync({ id: toggling.id, status: next })
      toast.success(t('admin.statusUpdated'))
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setToggling(null)
    }
  }

  const columns: Array<Column<ApprovalFlow>> = useMemo(() => {
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso))
    return [
      {
        key: 'name',
        header: t('admin.name'),
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-graydark dark:text-white">{row.name}</span>
            {row.description && (
              <span className="max-w-64 truncate text-xs text-bodystroke">{row.description}</span>
            )}
          </div>
        ),
      },
      {
        key: 'entityType',
        header: t('admin.entityType'),
        render: (row) => (
          <Badge tone="primary">{t(`admin.entityType.${row.entityType}`)}</Badge>
        ),
      },
      {
        key: 'company',
        header: t('tickets.companyField'),
        render: (row) => (
          <span className="text-sm text-body dark:text-bodydark">{row.company?.name ?? '—'}</span>
        ),
      },
      {
        key: 'stages',
        header: t('admin.stages'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">
            {row.rules?.stages?.length ?? 0}
          </span>
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
        key: 'createdAt',
        header: t('dashboard.created'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">{formatDate(row.createdAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            {isManagerOrAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  title={t('common.edit')}
                  className="rounded-lg p-2 text-bodystroke transition-colors hover:bg-graylight hover:text-primary dark:hover:bg-boxdark-2"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setToggling(row)}
                  title={row.status === 'ACTIVE' ? t('admin.deactivate') : t('admin.activate')}
                  className={cn(
                    'rounded-lg p-2 transition-colors hover:bg-graylight dark:hover:bg-boxdark-2',
                    row.status === 'ACTIVE'
                      ? 'text-bodystroke hover:text-error'
                      : 'text-bodystroke hover:text-success',
                  )}
                >
                  <Power className="size-4" />
                </button>
              </>
            )}
          </div>
        ),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, isManagerOrAdmin])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('nav.approvalFlows')}
          </h2>
          <p className="text-sm text-bodystroke">{t('admin.approvalSubtitle')}</p>
        </div>
        {isManagerOrAdmin && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('admin.newFlow')}
          </Button>
        )}
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<CheckSquare className="size-6 text-error" />}
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
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table<ApprovalFlow>
            columns={columns}
            rows={data ?? []}
            keyFor={(row) => row.id}
            loading={false}
            empty={t('common.empty')}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t('admin.editFlow') : t('admin.newFlow')}
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void submit()} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('admin.name')} required error={formErrors.name}>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              maxLength={120}
            />
          </FormField>

          <FormField label={t('tickets.descriptionField')}>
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={2}
              maxLength={255}
            />
          </FormField>

          <FormField label={t('admin.entityType')} required>
            <Select
              value={form.entityType}
              onChange={(event) => setForm({ ...form, entityType: event.target.value })}
            >
              {ENTITY_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`admin.entityType.${value}`)}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-graydark dark:text-white">{t('admin.stages')}</p>
              <Button variant="secondary" size="sm" onClick={() => setForm((prev) => ({ ...prev, stages: [...prev.stages, emptyStage()] }))}>
                <Plus className="size-4" />
                {t('admin.addStage')}
              </Button>
            </div>
            {formErrors.stages && (
              <p className="text-xs text-error">{formErrors.stages}</p>
            )}

            <div className="flex flex-col gap-2">
              {form.stages.map((stage, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-stroke p-2 dark:border-strokedark"
                >
                  <Badge tone="primary" className="shrink-0">
                    {index + 1}
                  </Badge>
                  <Select
                    value={stage.type}
                    onChange={(event) => updateStage(index, { type: event.target.value as StageType, value: '' })}
                    className="w-32"
                  >
                    {STAGE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`admin.stageType.${type}`)}
                      </option>
                    ))}
                  </Select>
                  {stage.type === 'role' && (
                    <Select
                      value={stage.value}
                      onChange={(event) => updateStage(index, { value: event.target.value })}
                      className="flex-1 min-w-40"
                    >
                      {APPROVER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(`domain.role.${role}`)}
                        </option>
                      ))}
                    </Select>
                  )}
                  {stage.type === 'group' && (
                    <Select
                      value={stage.value}
                      onChange={(event) => updateStage(index, { value: event.target.value })}
                      className="flex-1 min-w-40"
                    >
                      <option value="">—</option>
                      {(groupsQuery.data ?? []).map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.agentsCount} {t('admin.agentsCount').toLowerCase()})
                        </option>
                      ))}
                    </Select>
                  )}
                  {stage.type === 'user' && (
                    <Select
                      value={stage.value}
                      onChange={(event) => updateStage(index, { value: event.target.value })}
                      className="flex-1 min-w-40"
                    >
                      <option value="">—</option>
                      {teamUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveStage(index, -1)}
                      title={t('admin.moveUp')}
                      className="rounded p-1.5 text-bodystroke transition-colors hover:text-primary disabled:opacity-30"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === form.stages.length - 1}
                      onClick={() => moveStage(index, 1)}
                      title={t('admin.moveDown')}
                      className="rounded p-1.5 text-bodystroke transition-colors hover:text-primary disabled:opacity-30"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={form.stages.length === 1}
                      onClick={() => setForm((prev) => ({ ...prev, stages: prev.stages.filter((_, i) => i !== index) }))}
                      title={t('common.delete')}
                      className="rounded p-1.5 text-bodystroke transition-colors hover:text-error disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
              {form.stages.length === 0 && (
                <p className="text-sm text-bodystroke">{t('admin.flowNeedsStage')}</p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.status === 'ACTIVE' ? t('admin.deactivate') : t('admin.activate')}
        message={t('admin.toggleFlowConfirm', { name: toggling?.name ?? '' })}
        loading={updateStatus.isPending}
        onConfirm={() => void toggleStatus()}
        onCancel={() => setToggling(null)}
      />
    </div>
  )
}