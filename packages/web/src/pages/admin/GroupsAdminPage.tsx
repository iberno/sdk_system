import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, Plus, Power, UsersRound } from 'lucide-react'

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
  useAdminGroupDetail,
  useAdminGroups,
  useCreateGroup,
  useReplaceGroupAgents,
  useUpdateGroup,
  useUpdateGroupStatus,
} from '@/hooks/useAdmin'
import { useAgents } from '@/hooks/useDirectory'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { AdminGroup } from '@/types/admin'

const LEVEL_ORDER = ['N1', 'N2', 'N3', 'N4', 'REDES', 'INFRA', 'DEVOPS', 'DATABASE', 'SECURITY']

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PENDING: 'warning',
}

interface GroupForm {
  name: string
  description: string
  level: string
}

function AgentPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const { t } = useTranslation()
  const { data: agents = [], isLoading } = useAgents(true)

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
    } else {
      onChange([...selected, id])
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  if (agents.length === 0) {
    return <p className="text-sm text-bodystroke">{t('admin.noAgents')}</p>
  }

  return (
    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-stroke p-1.5 dark:border-strokedark">
      {agents.map((agent) => {
        const checked = selected.includes(agent.id)
        return (
          <label
            key={agent.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors',
              checked
                ? 'bg-primary/10 dark:bg-primary/15'
                : 'hover:bg-graylight dark:hover:bg-boxdark-2',
            )}
          >
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded border transition-colors',
                checked ? 'border-primary bg-primary text-white' : 'border-bodystroke',
              )}
            >
              {checked && <Check className="size-3" />}
            </span>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(agent.id)}
              className="sr-only"
            />
            <span className="text-sm font-medium text-graydark dark:text-white">{agent.name}</span>
            <span className="ml-auto truncate text-xs text-bodystroke">{agent.email}</span>
          </label>
        )
      })}
    </div>
  )
}

export default function GroupsAdminPage() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'ADMIN'

  const { data, isLoading, isError, refetch } = useAdminGroups()
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const replaceAgents = useReplaceGroupAgents()
  const updateStatus = useUpdateGroupStatus()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminGroup | null>(null)
  const [form, setForm] = useState<GroupForm>({ name: '', description: '', level: 'N1' })
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [toggling, setToggling] = useState<AdminGroup | null>(null)
  const [saving, setSaving] = useState(false)

  const [membersGroupId, setMembersGroupId] = useState<string | null>(null)
  const detailQuery = useAdminGroupDetail(membersGroupId)
  const [memberSelection, setMemberSelection] = useState<string[]>([])

  useEffect(() => {
    if (detailQuery.data) {
      setMemberSelection(detailQuery.data.agents.map((a) => a.id))
    }
  }, [detailQuery.data])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', level: 'N1' })
    setSelectedAgents([])
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (group: AdminGroup) => {
    setEditing(group)
    setForm({ name: group.name, description: group.description ?? '', level: group.level })
    setSelectedAgents([])
    setFormErrors({})
    setModalOpen(true)
  }

  const submit = async () => {
    const errors: Record<string, string> = {}
    if (form.name.trim().length < 3) errors.name = t('tickets.createError')
    if (!editing && selectedAgents.length === 0) errors.agents = t('admin.groupMinOneAgent')
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateGroup.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          level: form.level,
        })
        toast.success(t('admin.groupUpdated'))
      } else {
        await createGroup.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || null,
          level: form.level,
          agentIds: selectedAgents,
        })
        toast.success(t('admin.groupCreated'))
      }
      setModalOpen(false)
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const saveMembers = async () => {
    if (!membersGroupId) return
    if (memberSelection.length === 0) {
      toast.error(t('admin.groupMinOneAgent'))
      return
    }
    try {
      await replaceAgents.mutateAsync({ id: membersGroupId, agentIds: memberSelection })
      toast.success(t('admin.membersUpdated'))
      setMembersGroupId(null)
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

  const columns: Array<Column<AdminGroup>> = useMemo(() => {
    const LEVEL_TONE: Record<string, 'primary' | 'info' | 'neutral' | 'success' | 'warning'> = {
      N1: 'primary',
      N2: 'info',
      N3: 'warning',
      N4: 'warning',
      REDES: 'info',
      INFRA: 'info',
      DEVOPS: 'success',
      DATABASE: 'success',
      SECURITY: 'neutral',
    }
    return [
      {
        key: 'name',
        header: t('tickets.groupLabel'),
        render: (row) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-graydark dark:text-white">{row.name}</span>
            {row.description && (
              <span className="max-w-60 truncate text-xs text-bodystroke">{row.description}</span>
            )}
          </div>
        ),
      },
      {
        key: 'level',
        header: t('admin.level'),
        render: (row) => (
          <Badge tone={LEVEL_TONE[row.level] ?? 'neutral'}>{t(`domain.level.${row.level}`)}</Badge>
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
        key: 'agentsCount',
        header: t('admin.agentsCount'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">{row.agentsCount}</span>
        ),
      },
      {
        key: 'openTickets',
        header: t('admin.openTickets'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">{row.openTickets}</span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setMembersGroupId(row.id)}
              title={t('admin.members')}
              className="rounded-lg p-2 text-bodystroke transition-colors hover:bg-graylight hover:text-primary dark:hover:bg-boxdark-2"
            >
              <UsersRound className="size-4" />
            </button>
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
  }, [t, isAdmin])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('nav.groups')}
          </h2>
          <p className="text-sm text-bodystroke">{t('admin.groupsSubtitle')}</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('admin.newGroup')}
          </Button>
        )}
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<UsersRound className="size-6 text-error" />}
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
          <Table<AdminGroup>
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
        title={editing ? t('admin.editGroup') : t('admin.newGroup')}
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
              rows={3}
              maxLength={255}
            />
          </FormField>

          <FormField label={t('admin.level')} required>
            <Select
              value={form.level}
              onChange={(event) => setForm({ ...form, level: event.target.value })}
            >
              {LEVEL_ORDER.map((value) => (
                <option key={value} value={value}>
                  {t(`domain.level.${value}`)}
                </option>
              ))}
            </Select>
          </FormField>

          {!editing && (
            <FormField
              label={t('admin.agents')}
              required
              error={formErrors.agents}
              hint={t('admin.groupMinOneAgent')}
            >
              <AgentPicker selected={selectedAgents} onChange={setSelectedAgents} />
            </FormField>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(membersGroupId)}
        title={t('admin.membersTitle')}
        onClose={() => setMembersGroupId(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMembersGroupId(null)}>
              {t('common.cancel')}
            </Button>
            {isAdmin && (
              <Button onClick={() => void saveMembers()} loading={replaceAgents.isPending}>
                {t('common.save')}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="primary">{detailQuery.data?.name}</Badge>
            <Badge tone="neutral">
              {t('admin.agentsCount')}: {detailQuery.data?.agentsCount ?? '—'}
            </Badge>
            <Badge tone="warning">
              {t('admin.openTickets')}: {detailQuery.data?.openTickets ?? '—'}
            </Badge>
          </div>
          {detailQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <AgentPicker selected={memberSelection} onChange={setMemberSelection} />
          )}
          {!isAdmin && <p className="text-xs text-bodystroke">{t('admin.roleHintManager')}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.status === 'ACTIVE' ? t('admin.deactivate') : t('admin.activate')}
        message={t('admin.toggleGroupConfirm', { name: toggling?.name ?? '' })}
        loading={updateStatus.isPending}
        onConfirm={() => void toggleStatus()}
        onCancel={() => setToggling(null)}
      />
    </div>
  )
}
