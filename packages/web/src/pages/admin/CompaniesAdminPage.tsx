import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Pencil, Plus, Power } from 'lucide-react'

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
import { toast } from '@/components/ui/toast-store'
import {
  useAdminCompanies,
  useCreateCompany,
  useUpdateCompany,
  useUpdateCompanyStatus,
} from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'
import type { AdminCompany } from '@/types/admin'

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PENDING: 'warning',
}

interface CompanyForm {
  name: string
  cnpj: string
  status: string
}

export default function CompaniesAdminPage() {
  const { t } = useTranslation()

  const { data, isLoading, isError, refetch } = useAdminCompanies()
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany()
  const updateStatus = useUpdateCompanyStatus()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCompany | null>(null)
  const [form, setForm] = useState<CompanyForm>({ name: '', cnpj: '', status: 'ACTIVE' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [toggling, setToggling] = useState<AdminCompany | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', cnpj: '', status: 'ACTIVE' })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (company: AdminCompany) => {
    setEditing(company)
    setForm({ name: company.name, cnpj: company.cnpj ?? '', status: company.status })
    setFormErrors({})
    setModalOpen(true)
  }

  const submit = async () => {
    const errors: Record<string, string> = {}
    if (form.name.trim().length < 3) errors.name = t('tickets.createError')
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (editing) {
        await updateCompany.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          ...(form.cnpj.trim() ? { cnpj: form.cnpj.trim() } : {}),
        })
        toast.success(t('admin.companyUpdated'))
      } else {
        await createCompany.mutateAsync({
          name: form.name.trim(),
          cnpj: form.cnpj.trim() || null,
          status: form.status,
        })
        toast.success(t('admin.companyCreated'))
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

  const columns: Array<Column<AdminCompany>> = useMemo(() => {
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }).format(new Date(iso))
    return [
      {
        key: 'name',
        header: t('tickets.companyField'),
        render: (row) => (
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15 dark:text-accent">
              <Building2 className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-graydark dark:text-white">{row.name}</span>
              <span className="text-xs tabular-nums text-bodystroke">{row.cnpj ?? '—'}</span>
            </div>
          </div>
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
        key: 'usersCount',
        header: t('admin.usersCount'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">{row.usersCount}</span>
        ),
      },
      {
        key: 'ticketsCount',
        header: t('admin.ticketsCount'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">{row.ticketsCount}</span>
        ),
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
            {t('nav.companies')}
          </h2>
          <p className="text-sm text-bodystroke">{t('admin.companiesSubtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {t('admin.newCompany')}
        </Button>
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<Building2 className="size-6 text-error" />}
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
          <Table<AdminCompany>
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
        title={editing ? t('admin.editCompany') : t('admin.newCompany')}
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

          <FormField label={t('admin.cnpj')} hint={t('admin.cnpjHint')}>
            <Input
              value={form.cnpj}
              onChange={(event) => setForm({ ...form, cnpj: event.target.value })}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
          </FormField>

          {!editing && (
            <FormField label={t('common.status')}>
              <Select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                {['ACTIVE', 'INACTIVE', 'PENDING'].map((value) => (
                  <option key={value} value={value}>
                    {t(`domain.status.${value}`)}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.status === 'ACTIVE' ? t('admin.deactivate') : t('admin.activate')}
        message={t('admin.toggleCompanyConfirm', { name: toggling?.name ?? '' })}
        loading={updateStatus.isPending}
        onConfirm={() => void toggleStatus()}
        onCancel={() => setToggling(null)}
      />
    </div>
  )
}
