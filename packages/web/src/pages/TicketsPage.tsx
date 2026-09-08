import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FolderClock, Plus, Search } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table } from '@/components/ui/Table'
import type { Column, SortDirection } from '@/components/ui/Table'
import { STATUS_TONE, PRIORITY_TONE, TYPE_TONE, STATUS_ORDER, PRIORITY_ORDER, TYPE_ORDER } from '@/lib/domain'
import { useTickets } from '@/hooks/useTickets'
import { useSolverGroups } from '@/hooks/useDirectory'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { TicketListItem } from '@/types/ticket'

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function SlaChip({ slaResolveAt, slaBreached, isOpen }: { slaResolveAt: string | null; slaBreached: boolean; isOpen: boolean }) {
  const { t } = useTranslation()
  if (!isOpen || !slaResolveAt) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums',
        slaBreached ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      )}
    >
      <FolderClock className="size-3.5" />
      {t('tickets.slaChip', { date: new Intl.DateTimeFormat().format(new Date(slaResolveAt)) })}
    </span>
  )
}

export default function TicketsPage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const isTeam = user?.role !== 'USER'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [priority, setPriority] = useState('')
  const [group, setGroup] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const debouncedSearch = useDebouncedValue(search)

  const { data: groups = [] } = useSolverGroups(isTeam)

  const { data, isLoading, isError, refetch } = useTickets({
    page,
    pageSize: 10,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(priority ? { priority } : {}),
    ...(isTeam && group ? { solverGroupId: group } : {}),
    ...(sortBy ? { sortBy, order: sortDirection } : {}),
  })

  const resetPage = () => setPage(1)

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDirection('asc')
    }
  }

  const columns: Array<Column<TicketListItem>> = useMemo(() => {
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso))
    return [
      {
        key: 'ticketNumber',
        header: t('nav.tickets'),
        sortable: true,
        render: (row) => (
          <div className="flex flex-col">
            <Link
              to={`/tickets/${row.id}`}
              className="font-medium text-graydark hover:text-primary dark:text-white dark:hover:text-accent"
            >
              {row.title}
            </Link>
            <span className="text-xs tabular-nums text-bodystroke">{row.ticketNumber}</span>
          </div>
        ),
      },
      {
        key: 'type',
        header: t('dashboard.type'),
        render: (row) => <Badge tone={TYPE_TONE[row.type]}>{t(`domain.type.${row.type}`)}</Badge>,
      },
      {
        key: 'status',
        header: t('common.status'),
        sortable: true,
        render: (row) => (
          <Badge tone={STATUS_TONE[row.status]} dot>
            {t(`domain.status.${row.status}`)}
          </Badge>
        ),
      },
      {
        key: 'priority',
        header: t('dashboard.priority'),
        sortable: true,
        render: (row) => <Badge tone={PRIORITY_TONE[row.priority]}>{t(`domain.priority.${row.priority}`)}</Badge>,
      },
      {
        key: 'requester',
        header: t('dashboard.requester'),
        render: (row) =>
          row.requester ? (
            <div className="flex items-center gap-2.5">
              <Avatar name={row.requester.name} size="sm" />
              <span className="text-sm text-body dark:text-bodydark">{row.requester.name}</span>
            </div>
          ) : (
            <span className="text-bodystroke">—</span>
          ),
      },
      {
        key: 'sla',
        header: t('tickets.sla'),
        render: (row) => (
          <SlaChip
            slaResolveAt={row.slaResolveAt}
            slaBreached={row.slaBreached}
            isOpen={!['RESOLVED', 'CLOSED'].includes(row.status)}
          />
        ),
      },
      {
        key: 'createdAt',
        header: t('dashboard.created'),
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="tabular-nums text-body dark:text-bodydark">{formatDate(row.createdAt)}</span>
        ),
      },
    ]
  }, [t])

  const pagination = data?.pagination

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">{t('nav.tickets')}</h1>
          <p className="text-sm text-bodystroke">
            {t('tickets.listSubtitle', { count: pagination?.totalItems ?? 0 })}
          </p>
        </div>
        <Link to="/tickets/new">
          <Button>
            <Plus className="size-4" />
            {t('tickets.new')}
          </Button>
        </Link>
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
        <div className="grid grid-cols-1 gap-3 border-b border-stroke p-4 dark:border-strokedark sm:grid-cols-2 lg:grid-cols-4">
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
          <Select
            value={type}
            onChange={(event) => {
              setType(event.target.value)
              resetPage()
            }}
          >
            <option value="">{t('common.all')} · {t('dashboard.type')}</option>
            {TYPE_ORDER.map((value) => (
              <option key={value} value={value}>
                {t(`domain.type.${value}`)}
              </option>
            ))}
          </Select>
          <Select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value)
              resetPage()
            }}
          >
            <option value="">{t('common.all')} · {t('dashboard.priority')}</option>
            {PRIORITY_ORDER.map((value) => (
              <option key={value} value={value}>
                {t(`domain.priority.${value}`)}
              </option>
            ))}
          </Select>
          {isTeam && (
            <Select
              value={group}
              onChange={(event) => {
                setGroup(event.target.value)
                resetPage()
              }}
            >
              <option value="">{t('common.all')} · {t('tickets.group')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        <Table<TicketListItem>
          columns={columns}
          rows={data?.items ?? []}
          keyFor={(row) => row.id}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
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
    </div>
  )
}