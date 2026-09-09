import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Power, Timer } from 'lucide-react'

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
import { toast } from '@/components/ui/toast-store'
import {
  useAdminSla,
  useCreateSlaPolicy,
  useUpdateSlaPolicy,
  useUpdateSlaPolicyStatus,
} from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { SlaPolicy } from '@/types/admin'

const TYPES = ['INCIDENT', 'SERVICE_REQUEST']
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const DEFAULT_RESPONSE_MIN = 480
const DEFAULT_RESOLVE_MIN = 2880

const formatMinutes = (minutes: number) => {
  if (minutes % 1440 === 0) return `${minutes / 1440}d`
  if (minutes % 60 === 0) return `${minutes / 60}h`
  return `${minutes}min`
}

interface PolicyForm {
  name: string
  description: string
  type: string
  priority: string
  responseTime: string
  resolveTime: string
}

export default function SlaAdminPage() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'ADMIN'

  const { data, isLoading, isError, refetch } = useAdminSla()
  const createPolicy = useCreateSlaPolicy()
  const updatePolicy = useUpdateSlaPolicy()
  const updateStatus = useUpdateSlaPolicyStatus()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SlaPolicy | null>(null)
  const [form, setForm] = useState<PolicyForm>({
    name: '',
    description: '',
    type: 'INCIDENT',
    priority: 'MEDIUM',
    responseTime: String(DEFAULT_RESPONSE_MIN),
    resolveTime: String(DEFAULT_RESOLVE_MIN),
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [toggling, setToggling] = useState<SlaPolicy | null>(null)
  const [saving, setSaving] = useState(false)

  const policiesByKey = useMemo(() => {
    const map = new Map<string, SlaPolicy>()
    for (const policy of data ?? []) {
      map.set(`${policy.type}:${policy.priority}`, policy)
    }
    return map
  }, [data])

  const openCreate = (type: string, priority: string) => {
    setEditing(null)
    setForm({
      name: '',
      description: '',
      type,
      priority,
      responseTime: String(DEFAULT_RESPONSE_MIN),
      resolveTime: String(DEFAULT_RESOLVE_MIN),
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (policy: SlaPolicy) => {
    setEditing(policy)
    setForm({
      name: policy.name,
      description: policy.description ?? '',
      type: policy.type,
      priority: policy.priority,
      responseTime: String(policy.responseTime),
      resolveTime: String(policy.resolveTime),
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const submit = async () => {
    const errors: Record<string, string> = {}
    if (form.name.trim().length < 3) errors.name = t('tickets.createError')
    const responseTime = Number(form.responseTime)
    const resolveTime = Number(form.resolveTime)
    if (!Number.isInteger(responseTime) || responseTime < 1)
      errors.responseTime = t('admin.invalidMinutes')
    if (!Number.isInteger(resolveTime) || resolveTime < 1)
      errors.resolveTime = t('admin.invalidMinutes')
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updatePolicy.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          responseTime,
          resolveTime,
        })
        toast.success(t('admin.slaUpdated'))
      } else {
        await createPolicy.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim() || null,
          type: form.type,
          priority: form.priority,
          responseTime,
          resolveTime,
        })
        toast.success(t('admin.slaCreated'))
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

  if (isError) {
    return (
      <Card>
        <EmptyState
          icon={<Timer className="size-6 text-error" />}
          title={t('common.error')}
          description={t('tickets.loadError')}
          action={
            <Button variant="secondary" onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('nav.sla')}
          </h2>
          <p className="text-sm text-bodystroke">{t('admin.slaSubtitle')}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openCreate(TYPES[0], PRIORITIES[2])}>
            <Plus className="size-4" />
            {t('admin.newSlaPolicy')}
          </Button>
        )}
      </div>

      <Card bodyClassName="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stroke/70 dark:border-strokedark">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-bodystroke">
                    {t('dashboard.type')}
                  </th>
                  {PRIORITIES.map((priority) => (
                    <th
                      key={priority}
                      className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-bodystroke"
                    >
                      {t(`domain.priority.${priority}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke/60 dark:divide-strokedark/60">
                {TYPES.map((type) => (
                  <tr
                    key={type}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 font-medium text-graydark dark:text-white">
                      {t(`domain.slaType.${type}`)}
                    </td>
                    {PRIORITIES.map((priority) => {
                      const policy = policiesByKey.get(`${type}:${priority}`)
                      const active = policy?.status === 'ACTIVE'
                      return (
                        <td key={priority} className="px-2 py-3 text-center">
                          {policy ? (
                            <button
                              type="button"
                              disabled={!isAdmin}
                              onClick={() => openEdit(policy)}
                              title={isAdmin ? t('common.edit') : undefined}
                              className={cn(
                                'group inline-flex w-full max-w-56 flex-col items-center gap-1 rounded-lg border px-3 py-2.5 transition-colors',
                                active
                                  ? 'border-stroke bg-white hover:border-primary dark:border-strokedark dark:bg-boxdark-2 dark:hover:border-primary'
                                  : 'border-stroke bg-graylight opacity-60 dark:border-strokedark dark:bg-boxdark-3',
                                isAdmin && 'cursor-pointer',
                              )}
                            >
                              <span className="text-xs font-medium text-graydark dark:text-white">
                                {policy.name}
                              </span>
                              <span className="tabular-nums text-[11px] text-bodystroke">
                                {t('admin.slaResp')} {formatMinutes(policy.responseTime)} ·{' '}
                                {t('admin.slaResol')} {formatMinutes(policy.resolveTime)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Badge tone={active ? 'success' : 'neutral'} dot>
                                  {t(`domain.status.${policy.status}`)}
                                </Badge>
                                {isAdmin && (
                                  <span className="flex items-center gap-0.5">
                                    <Pencil className="size-3 text-bodystroke opacity-0 transition-opacity group-hover:opacity-100" />
                                    <Power
                                      className="size-3 text-bodystroke opacity-0 transition-opacity group-hover:opacity-100"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setToggling(policy)
                                      }}
                                    />
                                  </span>
                                )}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!isAdmin}
                              onClick={() => openCreate(type, priority)}
                              className={cn(
                                'inline-flex w-full max-w-56 items-center justify-center gap-1.5 rounded-lg border border-dashed border-bodystroke px-3 py-2.5 text-xs text-bodystroke transition-colors',
                                isAdmin && 'hover:border-primary hover:text-primary',
                              )}
                            >
                              {isAdmin && <Plus className="size-3.5" />}
                              {t('admin.slaDefault', {
                                resp: formatMinutes(DEFAULT_RESPONSE_MIN),
                                resol: formatMinutes(DEFAULT_RESOLVE_MIN),
                              })}
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? t('admin.editSlaPolicy') : t('admin.newSlaPolicy')}
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
            <Input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={255}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('dashboard.type')} required>
              <Select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
                disabled={Boolean(editing)}
              >
                {TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t(`domain.slaType.${value}`)}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('dashboard.priority')} required>
              <Select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
                disabled={Boolean(editing)}
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`domain.priority.${value}`)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('admin.slaRespMin')} required error={formErrors.responseTime}>
              <Input
                type="number"
                min={1}
                value={form.responseTime}
                onChange={(event) => setForm({ ...form, responseTime: event.target.value })}
              />
            </FormField>

            <FormField label={t('admin.slaResolMin')} required error={formErrors.resolveTime}>
              <Input
                type="number"
                min={1}
                value={form.resolveTime}
                onChange={(event) => setForm({ ...form, resolveTime: event.target.value })}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.status === 'ACTIVE' ? t('admin.deactivate') : t('admin.activate')}
        message={t('admin.toggleSlaConfirm', { name: toggling?.name ?? '' })}
        loading={updateStatus.isPending}
        onConfirm={() => void toggleStatus()}
        onCancel={() => setToggling(null)}
      />
    </div>
  )
}
