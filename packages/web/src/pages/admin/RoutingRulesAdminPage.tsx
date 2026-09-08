import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, Pencil, Plus, Power, Route } from 'lucide-react'

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
  useCreateRoutingRule,
  useReorderRoutingRules,
  useRoutingRules,
  useUpdateRoutingRule,
  useUpdateRoutingRuleStatus,
} from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { RoutingRule } from '@/types/admin'

const TICKET_TYPES = ['INCIDENT', 'SERVICE_REQUEST']
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const STRATEGIES = ['TO_GROUP', 'ROUND_ROBIN', 'LEAST_LOADED', 'MANUAL']

const STRATEGY_TONE: Record<string, 'primary' | 'info' | 'success' | 'neutral' | 'warning'> = {
  TO_GROUP: 'primary',
  ROUND_ROBIN: 'info',
  LEAST_LOADED: 'success',
  MANUAL: 'neutral',
}

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PENDING: 'warning',
}

interface RuleForm {
  name: string
  description: string
  ticketType: string
  priority: string
  category: string
  strategy: string
  targetGroupId: string
}

export default function RoutingRulesAdminPage() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'ADMIN'

  const { data, isLoading, isError, refetch } = useRoutingRules()
  const groupsQuery = useAdminGroups()
  const createRule = useCreateRoutingRule()
  const updateRule = useUpdateRoutingRule()
  const updateStatus = useUpdateRoutingRuleStatus()
  const reorder = useReorderRoutingRules()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RoutingRule | null>(null)
  const [form, setForm] = useState<RuleForm>({
    name: '',
    description: '',
    ticketType: 'INCIDENT',
    priority: '',
    category: '',
    strategy: 'TO_GROUP',
    targetGroupId: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [toggling, setToggling] = useState<RoutingRule | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      description: '',
      ticketType: 'INCIDENT',
      priority: '',
      category: '',
      strategy: 'TO_GROUP',
      targetGroupId: '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (rule: RoutingRule) => {
    setEditing(rule)
    setForm({
      name: rule.name,
      description: rule.description ?? '',
      ticketType: rule.ticketType,
      priority: rule.priority ?? '',
      category: rule.category ?? '',
      strategy: rule.strategy,
      targetGroupId: rule.targetGroupId ?? '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const submit = async () => {
    const errors: Record<string, string> = {}
    if (form.name.trim().length < 3) errors.name = t('tickets.createError')
    if (form.strategy !== 'MANUAL' && !form.targetGroupId) {
      errors.targetGroupId = t('admin.ruleNeedsGroup')
    }
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateRule.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          ticketType: form.ticketType,
          priority: form.priority || null,
          category: form.category.trim() || null,
          strategy: form.strategy,
          targetGroupId: form.strategy === 'MANUAL' ? null : form.targetGroupId || null,
        })
        toast.success(t('admin.ruleUpdated'))
      } else {
        await createRule.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || null,
          ticketType: form.ticketType,
          priority: form.priority || null,
          category: form.category.trim() || null,
          strategy: form.strategy,
          targetGroupId: form.strategy === 'MANUAL' ? null : form.targetGroupId || null,
        })
        toast.success(t('admin.ruleCreated'))
      }
      setModalOpen(false)
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const move = async (rule: RoutingRule, direction: -1 | 1) => {
    if (!data) return
    const index = data.findIndex((r) => r.id === rule.id)
    const target = index + direction
    if (target < 0 || target >= data.length) return
    const next = [...data]
    ;[next[index], next[target]] = [next[target], next[index]]
    try {
      await reorder.mutateAsync(next.map((r, i) => ({ id: r.id, order: i })))
    } catch {
      toast.error(t('admin.saveError'))
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

  const columns: Array<Column<RoutingRule>> = useMemo(() => {
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso))
    return [
      {
        key: 'order',
        header: '#',
        className: 'w-16',
        render: (row) => {
          const index = data?.findIndex((r) => r.id === row.id) ?? 0
          return (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={!isAdmin || index === 0}
                onClick={() => void move(row, -1)}
                title={t('admin.moveUp')}
                className="rounded p-1 text-bodystroke transition-colors hover:text-primary disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={!isAdmin || index === (data?.length ?? 0) - 1}
                onClick={() => void move(row, 1)}
                title={t('admin.moveDown')}
                className="rounded p-1 text-bodystroke transition-colors hover:text-primary disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" />
              </button>
            </div>
          )
        },
      },
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
        key: 'conditions',
        header: t('admin.conditions'),
        render: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="primary">{t(`domain.type.${row.ticketType}`)}</Badge>
            {row.priority && <Badge tone="warning">{t(`domain.priority.${row.priority}`)}</Badge>}
            {row.category && <Badge tone="info">{row.category}</Badge>}
            {!row.priority && !row.category && (
              <span className="text-xs text-bodystroke">{t('admin.anyCondition')}</span>
            )}
          </div>
        ),
      },
      {
        key: 'strategy',
        header: t('admin.strategy'),
        render: (row) => (
          <Badge tone={STRATEGY_TONE[row.strategy] ?? 'neutral'}>
            {t(`domain.strategy.${row.strategy}`)}
          </Badge>
        ),
      },
      {
        key: 'targetGroup',
        header: t('admin.targetGroup'),
        render: (row) =>
          row.targetGroup ? (
            <span className="text-sm text-body dark:text-bodydark">
              {row.targetGroup.name}{' '}
              <span className="text-xs text-bodystroke">({row.targetGroup.level})</span>
            </span>
          ) : (
            <span className="text-bodystroke">—</span>
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
            {isAdmin && (
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
  }, [t, isAdmin, data])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('nav.routingRules')}
          </h2>
          <p className="text-sm text-bodystroke">{t('admin.routingSubtitle')}</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('admin.newRule')}
          </Button>
        )}
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<Route className="size-6 text-error" />}
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
          <Table<RoutingRule>
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
        title={editing ? t('admin.editRule') : t('admin.newRule')}
        onClose={() => setModalOpen(false)}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('dashboard.type')} required>
              <Select
                value={form.ticketType}
                onChange={(event) => setForm({ ...form, ticketType: event.target.value })}
              >
                {TICKET_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t(`domain.type.${value}`)}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('dashboard.priority')}>
              <Select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
              >
                <option value="">{t('common.all')}</option>
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`domain.priority.${value}`)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label={t('admin.categoryCondition')} hint={t('admin.categoryConditionHint')}>
            <Input
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              maxLength={120}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('admin.strategy')} required>
              <Select
                value={form.strategy}
                onChange={(event) => setForm({ ...form, strategy: event.target.value })}
              >
                {STRATEGIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`domain.strategy.${value}`)}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label={t('admin.targetGroup')}
              required={form.strategy !== 'MANUAL'}
              error={formErrors.targetGroupId}
              hint={form.strategy === 'MANUAL' ? t('admin.manualNoGroup') : undefined}
            >
              <Select
                value={form.targetGroupId}
                onChange={(event) => setForm({ ...form, targetGroupId: event.target.value })}
                disabled={form.strategy === 'MANUAL'}
              >
                <option value="">—</option>
                {(groupsQuery.data ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.agentsCount} {t('admin.agentsCount').toLowerCase()})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.status === 'ACTIVE' ? t('admin.deactivate') : t('admin.activate')}
        message={t('admin.toggleRuleConfirm', { name: toggling?.name ?? '' })}
        loading={updateStatus.isPending}
        onConfirm={() => void toggleStatus()}
        onCancel={() => setToggling(null)}
      />
    </div>
  )
}