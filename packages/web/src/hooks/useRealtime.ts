import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { connectSocket } from '@/lib/socket'
import { toast } from '@/components/ui/toast-store'
import { useNotificationsStore } from '@/stores/notificationsStore'

interface TicketCreatedEvent {
  ticketId: string
  ticketNumber: string
  title: string
  type: string
  priority: string
  status: string
  companyId: string
  requesterId: string
  beneficiaryId: string | null
  solverGroupId: string | null
  assigneeId: string | null
  createdAt: string
}

interface TicketUpdatedEvent {
  ticketId: string
  ticketNumber: string
  title: string
  status: string
  priority: string
  companyId: string
  updatedAt: string
}

interface TicketCommentedEvent {
  ticketId: string
  ticketNumber: string
  commentId: string
  authorId: string
  companyId: string
  visibility: string
  content: string
  createdAt: string
}

interface TicketAssignedEvent {
  ticketId: string
  ticketNumber: string
  title: string
  type: string
  priority: string
  companyId: string
  assignedBy: string
  assignedAt: string
}

interface ApprovalPendingEvent {
  approvalId: string
  order: number
  flowName: string
  entityType: string
  ticketId?: string
  changeId?: string
}

interface SlaBreachedEvent {
  ticketId: string
  ticketNumber: string
  companyId: string
  solverGroupId: string | null
  slaResolveAt: string
}

export function useRealtimeEvents() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const addNotification = useNotificationsStore((s) => s.add)

  useEffect(() => {
    const socket = connectSocket()
    if (!socket) return

    const onTicketCreated = (payload: TicketCreatedEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.info(t('realtime.ticketCreated', { number: payload.ticketNumber }))
      addNotification({
        type: 'ticket_created',
        title: payload.ticketNumber,
        message: payload.title,
        ticketId: payload.ticketId,
      })
    }
    const onTicketUpdated = (payload: TicketUpdatedEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
      void queryClient.invalidateQueries({ queryKey: ['ticket', payload.ticketId] })
    }
    const onTicketCommented = (payload: TicketCommentedEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['ticket', payload.ticketId] })
      addNotification({
        type: 'ticket_commented',
        title: payload.ticketNumber,
        message: t('realtime.ticketCommented', { number: payload.ticketNumber }),
        ticketId: payload.ticketId,
      })
    }
    const onTicketAssigned = (payload: TicketAssignedEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
      void queryClient.invalidateQueries({ queryKey: ['ticket', payload.ticketId] })
      toast.info(t('realtime.ticketAssigned', { number: payload.ticketNumber }))
      addNotification({
        type: 'ticket_assigned',
        title: payload.ticketNumber,
        message: t('realtime.ticketAssigned', { number: payload.ticketNumber }),
        ticketId: payload.ticketId,
      })
    }
    const onApprovalPending = (payload: ApprovalPendingEvent) => {
      toast.warning(t('realtime.approvalPending', { flow: payload.flowName }))
      addNotification({
        type: 'approval_pending',
        title: t('realtime.approvalPending', { flow: payload.flowName }),
        message: payload.entityType === 'TICKET' ? t('nav.tickets') : t('nav.changes'),
        ticketId: payload.ticketId,
      })
    }
    const onSlaBreached = (payload: SlaBreachedEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] })
      toast.warning(t('realtime.slaBreached', { number: payload.ticketNumber }))
      addNotification({
        type: 'sla_breached',
        title: payload.ticketNumber,
        message: t('realtime.slaBreached', { number: payload.ticketNumber }),
        ticketId: payload.ticketId,
      })
    }

    socket.on('ticket.created', onTicketCreated)
    socket.on('ticket.updated', onTicketUpdated)
    socket.on('ticket.commented', onTicketCommented)
    socket.on('ticket.assigned', onTicketAssigned)
    socket.on('approval.pending', onApprovalPending)
    socket.on('sla.breached', onSlaBreached)

    return () => {
      socket.off('ticket.created', onTicketCreated)
      socket.off('ticket.updated', onTicketUpdated)
      socket.off('ticket.commented', onTicketCommented)
      socket.off('ticket.assigned', onTicketAssigned)
      socket.off('approval.pending', onApprovalPending)
      socket.off('sla.breached', onSlaBreached)
    }
  }, [queryClient, t, addNotification])
}
