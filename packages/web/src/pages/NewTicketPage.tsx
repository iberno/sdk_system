import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Paperclip, Send } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SearchableSelect, type SelectOption } from '@/components/ui/SearchableSelect'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuthStore } from '@/stores/authStore'
import { PRIORITY_ORDER, TYPE_ORDER } from '@/lib/domain'
import type { TicketDetail } from '@/types/ticket'
import { toast } from '@/components/ui/toast-store'
import { useCreateTicket, useUploadAttachment } from '@/hooks/useTicketMutations'
import { useCategories, useCompanyOptions, useUserDirectory } from '@/hooks/useTicketFormData'
import { cn } from '@/lib/utils'

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

export default function NewTicketPage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const isTeam = user?.role !== 'USER'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('INCIDENT')
  const [priority, setPriority] = useState('MEDIUM')
  const [companyId, setCompanyId] = useState<string | null>(user?.companyId ?? null)
  const [beneficiaryId, setBeneficiaryId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({})

  const [created, setCreated] = useState<TicketDetail | null>(null)

  const companiesQuery = useCompanyOptions()
  const categoriesQuery = useCategories()
  const directoryQuery = useUserDirectory(companyId)

  const companyOptions = useMemo<SelectOption[]>(
    () => (companiesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [companiesQuery.data],
  )

  const beneficiaryOptions = useMemo<SelectOption[]>(
    () =>
      (directoryQuery.data ?? []).map((u) => ({
        value: u.id,
        label: u.department ? `${u.name} — ${u.department}` : u.name,
      })),
    [directoryQuery.data],
  )

  const categoryOptions = useMemo<SelectOption[]>(() => {
    const categories = categoriesQuery.data ?? []
    const parentIds = new Set(categories.map((c) => c.parentId).filter(Boolean))
    return categories
      .filter((c) => !parentIds.has(c.id))
      .map((c) => ({ value: c.id, label: c.path }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [categoriesQuery.data])

  const createMutation = useCreateTicket()
  const uploadMutation = useUploadAttachment(created?.id ?? '')

  const submit = async () => {
    const nextErrors: typeof errors = {}
    if (title.trim().length < 3) nextErrors.title = t('tickets.createError')
    if (description.trim().length < 3) nextErrors.description = t('tickets.createError')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      const ticket = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        type,
        ...(isTeam ? { priority } : {}),
        ...(companyId ? { companyId } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(beneficiaryId ? { beneficiaryId } : {}),
      })
      if (attachment && ticket.id) {
        try {
          await uploadMutation.mutateAsync(attachment)
          toast.success(t('tickets.addedAttachment'))
        } catch {
          toast.error(t('tickets.attachmentError'))
        }
      }
      setCreated(ticket)
    } catch {
      toast.error(t('tickets.createError'))
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setType('INCIDENT')
    setPriority('MEDIUM')
    setCompanyId(user?.companyId ?? null)
    setBeneficiaryId(null)
    setCategoryId(null)
    setAttachment(null)
    setErrors({})
    setCreated(null)
  }

  if (created) {
    const open = !['RESOLVED', 'CLOSED'].includes(created.status)
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Card>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-6 text-success" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
                {t('tickets.createdSuccess')}
              </h1>
              <p className="mt-1 text-sm text-bodystroke">{t('tickets.createdSubtitle')}</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-stroke bg-stroke dark:border-strokedark dark:bg-strokedark sm:grid-cols-2">
            <div className="flex flex-col gap-1 bg-white p-4 dark:bg-boxdark">
              <dt className="text-xs text-bodystroke">{t('nav.tickets')}</dt>
              <dd className="text-sm font-semibold tabular-nums text-graydark dark:text-white">
                {created.ticketNumber}
              </dd>
            </div>
            <div className="flex flex-col gap-1 bg-white p-4 dark:bg-boxdark">
              <dt className="text-xs text-bodystroke">{t('common.status')}</dt>
              <dd>
                <Badge tone="success">{t(`domain.status.${created.status}`)}</Badge>
              </dd>
            </div>
            <div className="flex flex-col gap-1 bg-white p-4 dark:bg-boxdark">
              <dt className="text-xs text-bodystroke">{t('tickets.companyField')}</dt>
              <dd className="text-sm text-body dark:text-bodydark">
                {created.company?.name ?? '—'}
              </dd>
            </div>
            <div className="flex flex-col gap-1 bg-white p-4 dark:bg-boxdark">
              <dt className="text-xs text-bodystroke">{t('tickets.categoryField')}</dt>
              <dd className="text-sm text-body dark:text-bodydark">
                {created.category?.path ?? '—'}
              </dd>
            </div>
            <div className="flex flex-col gap-1 bg-white p-4 dark:bg-boxdark">
              <dt className="text-xs text-bodystroke">{t('tickets.routedAuto')}</dt>
              <dd className="text-sm text-body dark:text-bodydark">
                {created.routedBy.auto
                  ? t('tickets.routedStrategy', { strategy: created.routedBy.strategy ?? '—' })
                  : t('tickets.routedManual')}
              </dd>
            </div>
            <div className="flex flex-col gap-1 bg-white p-4 dark:bg-boxdark">
              <dt className="text-xs text-bodystroke">{t('tickets.groupLabel')}</dt>
              <dd className="text-sm text-body dark:text-bodydark">
                {created.solverGroup?.name ?? '—'}
              </dd>
            </div>
            <div className="flex flex-col gap-1 bg-white p-4 dark:bg-boxdark">
              <dt className="text-xs text-bodystroke">{t('tickets.slaResponse')}</dt>
              <dd className="text-sm tabular-nums text-body dark:text-bodydark">
                {created.slaResponseAt ? formatDateTime(created.slaResponseAt) : '—'}
              </dd>
            </div>
            <div className="flex flex-col gap-1 bg-white p-4 dark:bg-boxdark">
              <dt className="text-xs text-bodystroke">{t('tickets.slaResolve')}</dt>
              <dd className={cn('text-sm tabular-nums dark:text-bodydark', open && 'text-error')}>
                {created.slaResolveAt ? formatDateTime(created.slaResolveAt) : '—'}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link to={`/tickets/${created.id}`}>
              <Button>{t('tickets.openTicket')}</Button>
            </Link>
            <Button variant="secondary" onClick={resetForm}>
              {t('tickets.createAnother')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
          {t('tickets.createTitle')}
        </h1>
        <p className="text-sm text-bodystroke">{t('tickets.createSubtitle')}</p>
      </div>

      <Card bodyClassName="flex flex-col gap-4">
        <FormField label={t('tickets.requester')}>
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border border-stroke bg-graylight px-3.5 py-2.5',
              'dark:border-strokedark dark:bg-boxdark-3',
            )}
          >
            <span className="text-sm font-medium text-graydark dark:text-white">{user?.name}</span>
            <span className="text-sm text-bodystroke">{user?.email}</span>
          </div>
        </FormField>

        <FormField label={t('tickets.titleField')} required error={errors.title}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('tickets.titlePlaceholder')}
            maxLength={120}
          />
        </FormField>

        <FormField label={t('tickets.descriptionField')} required error={errors.description}>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('tickets.descriptionPlaceholder')}
            rows={6}
            maxLength={4000}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('tickets.companyField')} required>
            <SearchableSelect
              options={companyOptions}
              value={companyId}
              onChange={(value) => {
                setCompanyId(value)
                setBeneficiaryId(null)
              }}
              placeholder={t('tickets.companyPlaceholder')}
              emptyMessage={t('common.noResults')}
              disabled={!isTeam || companiesQuery.isLoading}
              clearable={isTeam}
            />
          </FormField>

          <FormField
            label={t('tickets.beneficiary')}
            hint={t('tickets.beneficiaryHint')}
          >
            <SearchableSelect
              options={beneficiaryOptions}
              value={beneficiaryId}
              onChange={setBeneficiaryId}
              placeholder={t('tickets.beneficiaryPlaceholder')}
              emptyMessage={t('common.noResults')}
              disabled={!companyId || directoryQuery.isLoading}
              clearable
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('tickets.typeField')} required>
            <Select value={type} onChange={(event) => setType(event.target.value)}>
              {TYPE_ORDER.map((value) => (
                <option key={value} value={value}>
                  {t(`domain.type.${value}`)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label={t('tickets.priorityField')}
            hint={isTeam ? undefined : t('tickets.priorityHint')}
          >
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              disabled={!isTeam}
            >
              {PRIORITY_ORDER.map((value) => (
                <option key={value} value={value}>
                  {t(`domain.priority.${value}`)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label={t('tickets.categoryField')} hint={t('tickets.categoryHint')}>
          <SearchableSelect
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            placeholder={t('tickets.categoryPlaceholder')}
            emptyMessage={t('common.noResults')}
            disabled={categoriesQuery.isLoading}
            clearable
          />
        </FormField>

        {isTeam && (
          <FormField label={t('tickets.attachmentField')} hint={t('tickets.attachHint')}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-dashed border-bodystroke px-3.5 py-2.5 text-sm',
                'text-bodystroke transition-colors hover:border-primary hover:text-primary dark:border-strokedark dark:text-bodydark',
              )}
            >
              <Paperclip className="size-4" />
              {attachment ? attachment.name : t('tickets.attach')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
            />
          </FormField>
        )}

        <div className="flex justify-end gap-3 border-t border-stroke pt-4 dark:border-strokedark">
          <Button loading={createMutation.isPending} onClick={() => void submit()}>
            <Send className="size-4" />
            {t('tickets.createSubmit')}
          </Button>
        </div>
      </Card>
    </div>
  )
}