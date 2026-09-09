import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckSquare, GitBranch, Ticket } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/toast-store'
import { useApproveApproval, useApprovals, useRejectApproval } from '@/hooks/useAdmin'
import type { ApprovalItem } from '@/types/admin'

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

const STATUS_TABS: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

const statusTone = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
} as const

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

export default function ApprovalsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ApprovalStatus>('PENDING')

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-graydark dark:text-white">
          {t('nav.approvals')}
        </h1>
        <p className="text-sm text-body dark:text-bodydark">{t('approvals.subtitle')}</p>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as ApprovalStatus)}
        items={STATUS_TABS.map((status) => ({
          key: status,
          label: t(`approvals.tabs.${status.toLowerCase()}`),
          content: <ApprovalList status={status} />,
        }))}
      />
    </div>
  )
}

function ApprovalList({ status }: { status: ApprovalStatus }) {
  const { t } = useTranslation()
  const { data, isLoading } = useApprovals(status)
  const approve = useApproveApproval()
  const reject = useRejectApproval()

  const [acting, setActing] = useState<ApprovalItem | null>(null)
  const [rejecting, setRejecting] = useState<ApprovalItem | null>(null)
  const [comment, setComment] = useState('')
  const [rejectError, setRejectError] = useState(false)

  const closeModals = () => {
    setActing(null)
    setRejecting(null)
    setComment('')
    setRejectError(false)
  }

  const confirmApprove = async () => {
    if (!acting) return
    try {
      await approve.mutateAsync({ id: acting.id, comment: comment.trim() || undefined })
      toast.success(t('approvals.approvedToast'))
      closeModals()
    } catch {
      toast.error(t('approvals.error'))
    }
  }

  const confirmReject = async () => {
    if (!rejecting) return
    const reason = comment.trim()
    if (reason.length < 3) {
      setRejectError(true)
      return
    }
    try {
      await reject.mutateAsync({ id: rejecting.id, comment: reason })
      toast.success(t('approvals.rejectedToast'))
      closeModals()
    } catch {
      toast.error(t('approvals.error'))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" count={3} />
      </div>
    )
  }

  const items = data ?? []

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CheckSquare className="size-6" aria-hidden="true" />}
        title={t('approvals.empty')}
      />
    )
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((approval) => (
          <div
            key={approval.id}
            className="rounded-xl border border-stroke/80 bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-graylight text-bodystroke dark:bg-boxdark-3">
                  {approval.entity?.type === 'CHANGE' ? (
                    <GitBranch className="size-4.5" aria-hidden="true" />
                  ) : (
                    <Ticket className="size-4.5" aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={approval.entity?.type === 'CHANGE' ? 'warning' : 'info'}>
                      {approval.entity?.type === 'CHANGE'
                        ? t('approvals.entity.change')
                        : t('approvals.entity.ticket')}
                    </Badge>
                    {approval.entity?.reference ? (
                      <span className="text-xs font-semibold text-primary">
                        {approval.entity.reference}
                      </span>
                    ) : null}
                    <Badge tone={statusTone[approval.status]}>
                      {t(`domain.status.${approval.status}`)}
                    </Badge>
                  </div>

                  <p className="mt-1.5 truncate text-sm font-medium text-graydark dark:text-white">
                    {approval.entity?.title ?? '—'}
                  </p>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-bodystroke">
                    {approval.flowName ? (
                      <span>
                        {t('approvals.flow')}: {approval.flowName}
                      </span>
                    ) : null}
                    <span>{t('approvals.stage', { order: approval.order })}</span>
                    {approval.entity?.requester ? (
                      <span>
                        {t('approvals.requester')}: {approval.entity.requester}
                      </span>
                    ) : null}
                    <span>{formatDate(approval.createdAt)}</span>
                  </div>

                  {approval.comment ? (
                    <p className="mt-2 rounded-lg bg-graylight px-3 py-2 text-xs italic text-body dark:bg-boxdark-3 dark:text-bodydark">
                      “{approval.comment}”
                    </p>
                  ) : null}
                </div>
              </div>

              {approval.status === 'PENDING' ? (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => setActing(approval)}>
                    {t('approvals.approve')}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setRejecting(approval)}>
                    {t('approvals.reject')}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={acting !== null}
        title={t('approvals.approveTitle')}
        onClose={closeModals}
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              {t('common.cancel')}
            </Button>
            <Button loading={approve.isPending} onClick={confirmApprove}>
              {t('approvals.approve')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-body dark:text-bodydark">
          {t('approvals.approveDescription', {
            title: acting?.entity?.title ?? '',
          })}
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('approvals.commentOptional')}
        />
      </Modal>

      <Modal
        open={rejecting !== null}
        title={t('approvals.rejectTitle')}
        onClose={closeModals}
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={reject.isPending} onClick={confirmReject}>
              {t('approvals.reject')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-body dark:text-bodydark">
          {t('approvals.rejectDescription', {
            title: rejecting?.entity?.title ?? '',
          })}
        </p>
        <Textarea
          className="mt-3"
          rows={3}
          invalid={rejectError}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value)
            setRejectError(false)
          }}
          placeholder={t('approvals.commentRequired')}
        />
        {rejectError ? (
          <p className="mt-1.5 text-xs text-error">{t('approvals.commentRequiredError')}</p>
        ) : null}
      </Modal>
    </>
  )
}