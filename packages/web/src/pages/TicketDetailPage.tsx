import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Building2,
  CheckCheck,
  ClipboardList,
  FileText,
  History,
  BookOpen,
  GitBranch,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/toast-store'
import {
  useAssignTicket,
  useAddComment,
  useChangeStatus,
  usePickupTicket,
  useUploadAttachment,
} from '@/hooks/useTicketMutations'
import { useTicket } from '@/hooks/useTickets'
import { useAgents, useSolverGroups } from '@/hooks/useDirectory'
import { useKnowledgeArticles } from '@/hooks/useKnowledge'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import { PRIORITY_TONE, STATUS_TONE, TYPE_TONE } from '@/lib/domain'
import { cn } from '@/lib/utils'

const formatDateTime = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—'

const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso)) : '—'

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function PersonaRow({ label, person }: { label: string; person: { name: string } | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-bodystroke">{label}</span>
      <div className="flex items-center gap-2">
        {person ? (
          <>
            <Avatar name={person.name} size="sm" />
            <span className="text-sm text-body dark:text-bodydark">{person.name}</span>
          </>
        ) : (
          <span className="text-sm text-bodystroke">—</span>
        )}
      </div>
    </div>
  )
}

export default function TicketDetailPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const user = useAuthStore((state) => state.user)
  const isTeam = user?.role !== 'USER'
  const isManagerAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  const { data: ticket, isLoading, isError, refetch } = useTicket(id)
  const [comment, setComment] = useState('')
  const [visibility, setVisibility] = useState<'PUBLIC' | 'INTERNAL'>('PUBLIC')
  const [showResolve, setShowResolve] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')

  const statusMutation = useChangeStatus(id)
  const commentMutation = useAddComment(id)
  const pickupMutation = usePickupTicket(id)
  const assignMutation = useAssignTicket(id)
  const uploadMutation = useUploadAttachment(id)

  const { data: agents = [] } = useAgents(isManagerAdmin)
  const { data: groups = [] } = useSolverGroups(isTeam)
  const [assignTo, setAssignTo] = useState('')
  const [assignGroup, setAssignGroup] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categoryLeaf = ticket?.category?.path?.split(' > ').pop() ?? ''
  const kbQuery = useKnowledgeArticles(
    categoryLeaf ? { search: categoryLeaf, pageSize: 3 } : undefined,
    Boolean(categoryLeaf),
  )

  const actions = useMemo(() => {
    if (!ticket) return []
    const status = ticket.status
    const teamActions: Array<{ to: string; label: string; note?: boolean }> = []
    const participantActions: Array<{ to: string; label: string; note?: boolean }> = []
    if (status === 'OPEN' || status === 'PENDING' || status === 'WAITING_USER' || status === 'WAITING_APPROVAL') {
      teamActions.push({ to: 'IN_PROGRESS', label: t('tickets.startWork') })
    }
    if (status === 'IN_PROGRESS') {
      teamActions.push({ to: 'RESOLVED', label: t('tickets.resolve'), note: true })
    }
    if (status === 'RESOLVED') {
      participantActions.push({ to: 'CLOSED', label: t('tickets.close') })
    }
    if (status === 'CLOSED') {
      participantActions.push({ to: 'IN_PROGRESS', label: t('tickets.reopen') })
    }
    return isTeam ? [...teamActions, ...participantActions] : participantActions
  }, [ticket, isTeam, t])

  const canPickup =
    isTeam && user?.role === 'AGENT' && !!ticket && !ticket.assignee && !!ticket.solverGroup && ticket.solverGroup.id === user.solverGroupId

  const submitComment = async () => {
    const content = comment.trim()
    if (!content) return
    try {
      await commentMutation.mutateAsync({ content, visibility })
      setComment('')
    } catch {
      toast.error(t('tickets.createError'))
    }
  }

  const runStatus = async (to: string, note?: string) => {
    try {
      await statusMutation.mutateAsync({ status: to, resolutionNote: note })
      setShowResolve(false)
      setResolutionNote('')
      toast.success(t('tickets.statusUpdated'))
    } catch {
      toast.error(t('tickets.createError'))
    }
  }

  const runPickup = async () => {
    if (!ticket?.solverGroup) return
    try {
      await pickupMutation.mutateAsync({ solverGroupId: ticket.solverGroup.id })
      toast.success(t('tickets.statusUpdated'))
    } catch {
      toast.error(t('tickets.createError'))
    }
  }

  const runAssign = async () => {
    if (!assignTo && !assignGroup) return
    try {
      await assignMutation.mutateAsync({
        ...(assignTo ? { assigneeId: assignTo } : {}),
        ...(assignGroup ? { solverGroupId: assignGroup } : {}),
      })
      setAssignTo('')
      setAssignGroup('')
      toast.success(t('tickets.statusUpdated'))
    } catch {
      toast.error(t('tickets.createError'))
    }
  }

  const runUpload = async (file: File | undefined) => {
    if (!file || !ticket) return
    try {
      await uploadMutation.mutateAsync(file)
      toast.success(t('tickets.addedAttachment'))
    } catch {
      toast.error(t('tickets.attachmentError'))
    }
  }

  const downloadAttachment = async (attachmentId: string, filename: string) => {
    if (!ticket) return
    try {
      const { data } = await api.get(`/tickets/${ticket.id}/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('tickets.attachmentError'))
    }
  }

  const historyLabel = (field: string) => {
    const labels: Record<string, string> = {
      status: t('common.status'),
      priority: t('dashboard.priority'),
      type: t('dashboard.type'),
      assigneeId: t('tickets.assignee'),
      solverGroupId: t('tickets.groupLabel'),
      resolutionNote: t('tickets.resolveNote'),
    }
    return labels[field] ?? field
  }

  const historyValue = (field: string, value: string | null) => {
    if (value == null) return '—'
    if (field === 'status') return t(`domain.status.${value}`)
    if (field === 'priority') return t(`domain.priority.${value}`)
    if (field === 'type') return t(`domain.type.${value}`)
    return value
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="flex flex-col gap-5 xl:col-span-2">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="flex flex-col gap-5">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !ticket) {
    return (
      <Card>
        <EmptyState
          icon={<ClipboardList className="size-6 text-error" />}
          title={t('common.error')}
          description={t('tickets.notFound')}
          action={
            <Button variant="secondary" onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      </Card>
    )
  }

  const breached = ticket.slaBreached

  return (
    <div className="flex flex-col gap-5">
      <nav>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          {t('tickets.backToList')}
        </Link>
      </nav>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{ticket.ticketNumber}</Badge>
              <Badge tone={STATUS_TONE[ticket.status]} dot>
                {t(`domain.status.${ticket.status}`)}
              </Badge>
              <Badge tone={TYPE_TONE[ticket.type]}>{t(`domain.type.${ticket.type}`)}</Badge>
              <Badge tone={PRIORITY_TONE[ticket.priority]}>{t(`domain.priority.${ticket.priority}`)}</Badge>
              {ticket.slaBreached && <Badge tone="error">{t('tickets.breached')}</Badge>}
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">{ticket.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-bodystroke">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="size-3.5" />
                {ticket.routedBy.auto
                  ? t('tickets.routedStrategy', { strategy: ticket.routedBy.strategy ?? '—' })
                  : t('tickets.routedManual')}
              </span>
              {ticket.solverGroup && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {ticket.solverGroup.name}
                </span>
              )}
              {ticket.company && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3.5" />
                  {ticket.company.name}
                </span>
              )}
              {ticket.category && (
                <span className="inline-flex items-center gap-1">
                  <Tag className="size-3.5" />
                  {ticket.category.path}
                </span>
              )}
            </div>
          </div>

          {actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {canPickup && (
                <Button variant="secondary" loading={pickupMutation.isPending} onClick={() => void runPickup()}>
                  <UserCheck className="size-4" />
                  {t('tickets.pickup')}
                </Button>
              )}
              {actions.map((action) => (
                <Button
                  key={action.to + (action.note ? '-note' : '')}
                  variant={action.to === 'RESOLVED' ? 'primary' : 'secondary'}
                  loading={statusMutation.isPending}
                  onClick={() => (action.note ? setShowResolve(true) : void runStatus(action.to))}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <Card title={t('tickets.details')} bodyClassName="flex flex-col gap-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-body dark:text-bodydark">
              {ticket.description}
            </p>
            {ticket.attachments.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5 border-t border-stroke pt-3 dark:border-strokedark">
                {ticket.attachments.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      onClick={() => void downloadAttachment(file.id, file.filename)}
                      className="group inline-flex w-full items-center gap-2.5 rounded-md px-0.5 py-1 text-left text-sm text-body hover:text-primary dark:text-bodydark"
                    >
                      <FileText className="size-4 shrink-0 text-bodystroke group-hover:text-primary" />
                      <span className="truncate">{file.filename}</span>
                      <span className="ml-auto text-xs tabular-nums text-bodystroke">{formatSize(file.size)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {isTeam && (
              <div className="mt-2 border-t border-stroke pt-3 dark:border-strokedark">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-bodystroke px-3.5 py-2 text-sm text-bodystroke transition-colors hover:border-primary hover:text-primary disabled:opacity-60 dark:border-strokedark dark:text-bodydark"
                >
                  <Paperclip className="size-4" />
                  {uploadMutation.isPending ? t('tickets.uploading') : t('tickets.attach')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    void runUpload(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </div>
            )}
          </Card>

          <Card
            title={t('tickets.comments')}
            actions={<MessageSquare className="size-4 text-bodystroke" />}
            bodyClassName="flex flex-col gap-4"
          >
            {ticket.comments.length === 0 && (
              <p className="text-sm text-bodystroke">{t('tickets.noComments')}</p>
            )}
            <ul className="flex flex-col gap-3.5">
              {ticket.comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Avatar name={c.author.name} size="sm" className="mt-0.5 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-graydark dark:text-white">{c.author.name}</span>
                      <span className="text-xs text-bodystroke">{formatDateTime(c.createdAt)}</span>
                      {c.visibility === 'INTERNAL' && <Badge tone="warning">{t('tickets.commentInternal')}</Badge>}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-body dark:text-bodydark">{c.content}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 border-t border-stroke pt-4 dark:border-strokedark">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t('tickets.commentPlaceholder')}
                rows={3}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                {isTeam ? (
                  <div className="flex gap-1 rounded-lg border border-stroke p-1 dark:border-strokedark">
                    {(['PUBLIC', 'INTERNAL'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVisibility(v)}
                        className={cn(
                          'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                          visibility === v
                            ? 'bg-primary text-white'
                            : 'text-bodystroke hover:text-body dark:hover:text-bodydark',
                        )}
                      >
                        {v === 'PUBLIC' ? t('tickets.commentPublic') : t('tickets.commentInternal')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span />
                )}
                <Button size="sm" disabled={!comment.trim()} loading={commentMutation.isPending} onClick={() => void submitComment()}>
                  <Send className="size-3.5" />
                  {t('tickets.commentSubmit')}
                </Button>
              </div>
              {isTeam && visibility === 'INTERNAL' && (
                <p className="text-xs text-bodystroke">{t('tickets.internalWarning')}</p>
              )}
            </div>
          </Card>

          <Card
            title={t('tickets.history')}
            actions={<History className="size-4 text-bodystroke" />}
            bodyClassName="flex flex-col gap-2"
          >
            {ticket.history.length === 0 && (
              <p className="text-sm text-bodystroke">{t('tickets.noHistory')}</p>
            )}
            <ul className="flex flex-col">
              {ticket.history.map((h, index) => (
                <li
                  key={`${h.field}-${h.createdAt}-${index}`}
                  className="flex flex-col gap-1 border-b border-stroke py-2.5 text-sm last:border-none dark:border-strokedark"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{historyLabel(h.field)}</Badge>
                    <span className="text-xs text-bodystroke">{formatDateTime(h.createdAt)}</span>
                  </div>
                  <p className="flex flex-wrap items-center gap-1 text-body dark:text-bodydark">
                    <span className="text-bodystroke">{t('tickets.from')}:</span>
                    <span className="line-through decoration-bodystroke/50">{historyValue(h.field, h.oldValue)}</span>
                    <span className="text-bodystroke">{t('tickets.to')}:</span>
                    <span className="font-medium text-graydark dark:text-white">
                      {historyValue(h.field, h.newValue)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card title={t('tickets.assignment')} bodyClassName="flex flex-col gap-3">
            <PersonaRow label={t('tickets.requester')} person={ticket.requester} />
            <PersonaRow label={t('tickets.beneficiary')} person={ticket.beneficiary} />
            <PersonaRow
              label={t('tickets.assignee')}
              person={ticket.assignee ? { name: ticket.assignee.name } : null}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-bodystroke">{t('tickets.groupLabel')}</span>
              <span className="flex items-center gap-1.5 text-sm text-body dark:text-bodydark">
                {ticket.solverGroup ? (
                  <>
                    <Users className="size-3.5 text-bodystroke" />
                    {ticket.solverGroup.name}
                  </>
                ) : (
                  <span className="text-bodystroke">{t('tickets.unassigned')}</span>
                )}
              </span>
            </div>

            {isManagerAdmin && (
              <div className="flex flex-col gap-2.5 border-t border-stroke pt-3 dark:border-strokedark">
                <label className="text-xs font-medium text-bodystroke">{t('tickets.groupLabel')}</label>
                <Select value={assignGroup} onChange={(event) => setAssignGroup(event.target.value)}>
                  <option value="">{t('tickets.selectGroup')}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
                <Select value={assignTo} onChange={(event) => setAssignTo(event.target.value)} disabled={!assignGroup}>
                  <option value="">{t('tickets.selectAgent')}</option>
                  {agents
                    .filter((a) => a.solverGroupId === assignGroup)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!assignGroup && !assignTo}
                  loading={assignMutation.isPending}
                  onClick={() => void runAssign()}
                >
                  <CheckCheck className="size-4" />
                  {t('tickets.assignSubmit')}
                </Button>
              </div>
            )}
          </Card>

          <Card title={t('tickets.slaCard')} bodyClassName="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-bodystroke">{t('tickets.slaResponse')}</span>
              <span className="text-sm tabular-nums text-body dark:text-bodydark">
                {formatDateTime(ticket.slaResponseAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-bodystroke">{t('tickets.slaResolve')}</span>
              <span className={cn('text-sm tabular-nums text-body dark:text-bodydark', breached && 'text-error')}>
                {formatDateTime(ticket.slaResolveAt)}
              </span>
            </div>
            <div className="mt-1 flex flex-col gap-2 border-t border-stroke pt-3 dark:border-strokedark">
              <TimelineRow label={t('tickets.createdOn')} date={ticket.timeline.createdAt} datetime />
              <TimelineRow label={t('tickets.firstResponse')} date={ticket.timeline.firstResponseAt} datetime />
              <TimelineRow label={t('tickets.resolvedOn')} date={ticket.timeline.resolvedAt} datetime />
              <TimelineRow label={t('tickets.closedOn')} date={ticket.timeline.closedAt} datetime />
            </div>
          </Card>

          {(ticket.relatedProblem || ticket.relatedChanges.length > 0 || (kbQuery.data?.items ?? []).length > 0) && (
            <Card title={t('tickets.related')} bodyClassName="flex flex-col gap-1.5">
              {ticket.relatedProblem && (
                <Link
                  to="/problems"
                  className="group flex items-center gap-2.5 rounded-lg border border-stroke px-3 py-2.5 transition-colors hover:border-primary dark:border-strokedark dark:hover:border-primary"
                >
                  <Wrench className="size-4 shrink-0 text-bodystroke group-hover:text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-graydark dark:text-white">
                      {ticket.relatedProblem.title}
                    </span>
                    <span className="text-xs text-bodystroke">{t('tickets.relatedProblem')}</span>
                  </span>
                  <Badge tone="warning">{t(`domain.status.${ticket.relatedProblem.status}`)}</Badge>
                </Link>
              )}
              {ticket.relatedChanges.map((change) => (
                <Link
                  key={change.id}
                  to="/changes"
                  className="group flex items-center gap-2.5 rounded-lg border border-stroke px-3 py-2.5 transition-colors hover:border-primary dark:border-strokedark dark:hover:border-primary"
                >
                  <GitBranch className="size-4 shrink-0 text-bodystroke group-hover:text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-graydark dark:text-white">
                      {change.title}
                    </span>
                    <span className="text-xs text-bodystroke">{t('tickets.relatedChange')}</span>
                  </span>
                  <Badge tone="info">{t(`domain.status.${change.status}`)}</Badge>
                </Link>
              ))}
              {(kbQuery.data?.items ?? []).map((article) => (
                <Link
                  key={article.id}
                  to={`/knowledge?search=${encodeURIComponent(categoryLeaf)}`}
                  className="group flex items-center gap-2.5 rounded-lg border border-stroke px-3 py-2.5 transition-colors hover:border-primary dark:border-strokedark dark:hover:border-primary"
                >
                  <BookOpen className="size-4 shrink-0 text-bodystroke group-hover:text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-graydark dark:text-white">
                      {article.title}
                    </span>
                    <span className="text-xs text-bodystroke">{t('tickets.relatedKb')}</span>
                  </span>
                  <Badge tone="neutral">{article.category}</Badge>
                </Link>
              ))}
            </Card>
          )}

          {ticket.approvals.length > 0 && (
            <Card title={t('tickets.approvals')} bodyClassName="flex flex-col gap-2.5">
              {ticket.approvals.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-stroke px-3 py-2.5 dark:border-strokedark">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-graydark dark:text-white">
                      {a.flowName ?? t('tickets.approvals')}
                    </span>
                    <span className="text-xs text-bodystroke">{a.approver?.name ?? '—'}</span>
                  </div>
                  <Badge tone={a.status === 'APPROVED' ? 'success' : a.status === 'REJECTED' ? 'error' : 'warning'}>
                    {t(`domain.status.${a.status}`)}
                  </Badge>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={showResolve}
        title={t('tickets.resolveTitle')}
        onClose={() => setShowResolve(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowResolve(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={statusMutation.isPending} onClick={() => void runStatus('RESOLVED', resolutionNote.trim() || undefined)}>
              {t('tickets.confirmResolve')}
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-graydark dark:text-white">
          {t('tickets.resolveNote')}
          <Textarea
            value={resolutionNote}
            onChange={(event) => setResolutionNote(event.target.value)}
            placeholder={t('tickets.resolveNotePlaceholder')}
            rows={4}
            maxLength={2000}
          />
        </label>
      </Modal>
    </div>
  )
}

function TimelineRow({ label, date, datetime }: { label: string; date: string | null; datetime?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-bodystroke">{label}</span>
      <span className="text-sm tabular-nums text-body dark:text-bodydark">
        {datetime ? formatDateTime(date) : formatDate(date)}
      </span>
    </div>
  )
}