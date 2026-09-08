import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Power, Search } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, type Column } from '@/components/ui/Table'
import { toast } from '@/components/ui/toast-store'
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
} from '@/hooks/useAdmin'
import { useSolverGroups } from '@/hooks/useDirectory'
import { useCompanyOptions } from '@/hooks/useTicketFormData'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { AdminUser } from '@/types/admin'

const ROLE_ORDER = ['ADMIN', 'MANAGER', 'AGENT', 'USER']
const STATUS_ORDER = ['ACTIVE', 'INACTIVE', 'PENDING']
const LOCALES = ['pt-BR', 'en-US', 'es-ES']

const ROLE_TONE: Record<string, 'primary' | 'info' | 'success' | 'neutral'> = {
  ADMIN: 'primary',
  MANAGER: 'info',
  AGENT: 'success',
  USER: 'neutral',
}

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  PENDING: 'warning',
}

interface UserForm {
  name: string
  email: string
  password: string
  role: string
  companyId: string
  solverGroupId: string
  locale: string
}

const emptyForm = (): UserForm => ({
  name: '',
  email: '',
  password: '',
  role: 'USER',
  companyId: '',
  solverGroupId: '',
  locale: 'pt-BR',
})

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function UsersAdminPage() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'ADMIN'

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isError, refetch } = useAdminUsers({
    page,
    pageSize: 10,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  })

  const companiesQuery = useCompanyOptions()
  const groupsQuery = useSolverGroups(true)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const updateStatus = useUpdateUserStatus()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm())
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [toggling, setToggling] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)

  const resetPage = () => setPage(1)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      companyId: user.companyId ?? '',
      solverGroupId: user.solverGroupId ?? '',
      locale: user.locale,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (form.name.trim().length < 3) errors.name = t('tickets.createError')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = t('auth.invalidEmail')
    if (!editing && form.password.length < 8) errors.password = t('admin.passwordTooShort')
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          email: form.email.trim(),
          locale: form.locale,
          companyId: form.companyId || null,
        }
        if (isAdmin) {
          if (form.password) payload.password = form.password
          if (form.role !== editing.role) payload.role = form.role
          payload.solverGroupId =
            form.role === 'AGENT' ? form.solverGroupId || null : null
        }
        await updateUser.mutateAsync({ id: editing.id, ...payload })
        toast.success(t('admin.userUpdated'))
      } else {
        await createUser.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          companyId: form.companyId || null,
          solverGroupId: form.role === 'AGENT' ? form.solverGroupId || null : null,
          locale: form.locale,
        })
        toast.success(t('admin.userCreated'))
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

  const columns: Array<Column<AdminUser>> = useMemo(() => {
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso))
    return [
      {
        key: 'name',
        header: t('auth.email'),
        render: (row) => (
          <div className="flex items-center gap-2.5">
            <Avatar name={row.name} size="sm" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-graydark dark:text-white">{row.name}</span>
              <span className="text-xs text-bodystroke">{row.email}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: t('admin.role'),
        render: (row) => <Badge tone={ROLE_TONE[row.role] ?? 'neutral'}>{t(`domain.role.${row.role}`)}</Badge>,
      },
      {
        key: 'company',
        header: t('tickets.companyField'),
        render: (row) => (
          <span className="text-sm text-body dark:text-bodydark">{row.company?.name ?? '—'}</span>
        ),
      },
      {
        key: 'group',
        header: t('tickets.groupLabel'),
        render: (row) => (
          <span className="text-sm text-body dark:text-bodydark">{row.solverGroup?.name ?? '—'}</span>
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
            <button
              type="button"
              onClick={() => openEdit(row)}
              title={t('common.edit')}
              className="rounded-lg p-2 text-bodystroke transition-colors hover:bg-graylight hover:text-primary dark:hover:bg-boxdark-2"
            >
              <Pencil className="size-4" />
            </button>
            {row.id !== currentUser?.id && (
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
            )}
          </div>
        ),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, isAdmin])

  const pagination = data?.pagination

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('nav.users')}
          </h2>
          <p className="text-sm text-bodystroke">{t('admin.usersSubtitle')}</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('admin.newUser')}
          </Button>
        )}
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<Search className="size-6 text-error" />}
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
                resetPage()
              }}
              placeholder={t('tickets.searchPlaceholder')}
              className="pl-10"
            />
          </div>
          <Select
            value={role}
            onChange={(event) => {
              setRole(event.target.value)
              resetPage()
            }}
          >
            <option value="">{t('common.all')} · {t('admin.role')}</option>
            {ROLE_ORDER.map((value) => (
              <option key={value} value={value}>
                {t(`domain.role.${value}`)}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              resetPage()
            }}
          >
            <option value="">{t('common.all')} · {t('common.status')}</option>
            {STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {t(`domain.status.${value}`)}
              </option>
            ))}
          </Select>
        </div>

        <Table<AdminUser>
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
        open={modalOpen}
        title={editing ? t('admin.editUser') : t('admin.newUser')}
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

          <FormField label={t('auth.email')} required error={formErrors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </FormField>

          {!editing && (
            <FormField label={t('auth.password')} required error={formErrors.password}>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="••••••••"
              />
            </FormField>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('admin.role')} required hint={!isAdmin ? t('admin.roleHintManager') : undefined}>
              <Select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                disabled={!isAdmin}
              >
                {ROLE_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {t(`domain.role.${value}`)}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('tickets.companyField')}>
              <Select
                value={form.companyId}
                onChange={(event) => setForm({ ...form, companyId: event.target.value })}
              >
                <option value="">—</option>
                {(companiesQuery.data ?? []).map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {form.role === 'AGENT' && (
            <FormField label={t('tickets.groupLabel')} hint={t('admin.groupRequiredAgent')}>
              <Select
                value={form.solverGroupId}
                onChange={(event) => setForm({ ...form, solverGroupId: event.target.value })}
                disabled={!isAdmin}
              >
                <option value="">—</option>
                {(groupsQuery.data ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.level})
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <FormField label={t('layout.language')}>
            <Select
              value={form.locale}
              onChange={(event) => setForm({ ...form, locale: event.target.value })}
            >
              {LOCALES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.status === 'ACTIVE' ? t('admin.deactivate') : t('admin.activate')}
        message={t('admin.toggleUserConfirm', { name: toggling?.name ?? '' })}
        loading={updateStatus.isPending}
        onConfirm={() => void toggleStatus()}
        onCancel={() => setToggling(null)}
      />
    </div>
  )
}