import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bug, Plus, Search } from 'lucide-react'

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
import { useCreateProblem, useProblems, useUpdateProblem } from '@/hooks/useProblemsChanges'
import { PRIORITY_TONE, STATUS_TONE } from '@/lib/domain'
import type { ProblemListItem } from '@/types/problem-change'

const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const IMPACT_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function ProblemsPage() {
  const { t } = useTranslation()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProblemListItem | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('MEDIUM')
  const [saving, setSaving] = useState(false)

  const { data, isLoading, isError, refetch } = useProblems({
    page,
    pageSize: 10,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  })

  const createProblem = useCreateProblem()
  const updateProblem = useUpdateProblem()

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setDescription('')
    setImpact('MEDIUM')
    setModalOpen(true)
  }

  const openEdit = (problem: ProblemListItem) => {
    setEditing(problem)
    setTitle(problem.title)
    setDescription(problem.description)
    setImpact(problem.impact)
    setModalOpen(true)
  }

  const submit = async () => {
    if (title.trim().length < 3 || description.trim().length < 3) {
      toast.error(t('tickets.createError'))
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateProblem.mutateAsync({
          id: editing.id,
          title: title.trim(),
          description: description.trim(),
          impact,
        })
        toast.success(t('admin.saved'))
      } else {
        await createProblem.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          impact,
        })
        toast.success(t('admin.saved'))
      }
      setModalOpen(false)
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const columns: Array<Column<ProblemListItem>> = useMemo(() => {
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
        key: 'status',
        header: t('common.status'),
        render: (row) => (
          <Badge tone={STATUS_TONE[row.status] ?? 'neutral'} dot>
            {t(`domain.status.${row.status}`)}
          </Badge>
        ),
      },
      {
        key: 'impact',
        header: t('tickets.impact'),
        render: (row) => (
          <Badge tone={PRIORITY_TONE[row.impact] ?? 'neutral'}>
            {t(`domain.priority.${row.impact}`)}
          </Badge>
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
        key: 'linkedTickets',
        header: t('tickets.linkedTickets'),
        align: 'right',
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">{row.linkedTickets}</span>
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
          <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
            {t('common.edit')}
          </Button>
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
            {t('nav.problems')}
          </h2>
          <p className="text-sm text-bodystroke">{t('admin.problemsSubtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {t('admin.newProblem')}
        </Button>
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<Bug className="size-6 text-error" />}
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
        <div className="grid grid-cols-1 gap-3 border-b border-stroke p-4 dark:border-strokedark sm:grid-cols-2">
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
                {t(`domain.status.${v}`)}
              </option>
            ))}
          </Select>
        </div>

        <Table<ProblemListItem>
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
        title={editing ? t('admin.editProblem') : t('admin.newProblem')}
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
          <FormField label={t('tickets.titleField')} required>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
          </FormField>

          <FormField label={t('tickets.descriptionField')} required>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={4000}
            />
          </FormField>

          <FormField label={t('tickets.impact')}>
            <Select value={impact} onChange={(event) => setImpact(event.target.value)}>
              {IMPACT_ORDER.map((v) => (
                <option key={v} value={v}>
                  {t(`domain.priority.${v}`)}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
