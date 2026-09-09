import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Inbox, UserPlus } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, type Column } from '@/components/ui/Table'
import { toast } from '@/components/ui/toast-store'
import { useUnassignedTickets } from '@/hooks/useTickets'
import { usePickupTicket } from '@/hooks/useTicketMutations'
import { PRIORITY_TONE, TYPE_TONE } from '@/lib/domain'
import type { TicketListItem } from '@/types/ticket'

export default function UnassignedQueuePage() {
  const { t } = useTranslation()
  const { data: tickets = [], isLoading, isError, refetch } = useUnassignedTickets()
  const [pickedUpId, setPickedUpId] = useState<string | null>(null)
  const pickupMutation = usePickupTicket(pickedUpId ?? '')

  const handlePickup = async (ticketId: string) => {
    setPickedUpId(ticketId)
    try {
      await pickupMutation.mutateAsync({ solverGroupId: '' })
      toast.success(t('tickets.pickupSuccess'))
    } catch {
      toast.error(t('tickets.pickupError'))
    }
  }

  const columns: Array<Column<TicketListItem>> = useMemo(() => {
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }).format(new Date(iso))
    return [
      {
        key: 'ticketNumber',
        header: t('nav.tickets'),
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
        key: 'priority',
        header: t('dashboard.priority'),
        sortable: true,
        render: (row) => (
          <Badge tone={PRIORITY_TONE[row.priority]}>{t(`domain.priority.${row.priority}`)}</Badge>
        ),
      },
      {
        key: 'requester',
        header: t('dashboard.requester'),
        render: (row) => (
          <span className="text-sm text-body dark:text-bodydark">{row.requester?.name ?? '—'}</span>
        ),
      },
      {
        key: 'createdAt',
        header: t('dashboard.created'),
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
          <Button
            size="sm"
            onClick={() => void handlePickup(row.id)}
            loading={pickupMutation.isPending}
          >
            <UserPlus className="size-4" />
            {t('tickets.pickup')}
          </Button>
        ),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
          {t('tickets.unassignedQueue')}
        </h2>
        <p className="text-sm text-bodystroke">{t('tickets.unassignedQueueSubtitle')}</p>
      </div>

      {isError && (
        <Card>
          <EmptyState
            icon={<Inbox className="size-6 text-error" />}
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
          <Table<TicketListItem>
            columns={columns}
            rows={tickets}
            keyFor={(row) => row.id}
            loading={false}
            empty={t('tickets.noUnassigned')}
          />
        )}
      </Card>
    </div>
  )
}
