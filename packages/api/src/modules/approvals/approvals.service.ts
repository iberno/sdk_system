import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  ChangeStatus,
  Priority,
  Prisma,
  Status,
  TicketStatus,
  TicketType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { RoutingRulesService } from '../routing-rules/routing-rules.service.js';
import {
  validateStages,
  type ApprovalStage,
} from '../approval-flows/approval-flows.service.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import { ApproveDto, QueryApprovalsDto, RejectDto } from './dto/approval.dto.js';

type Tx = Prisma.TransactionClient;

const ENTITY_INCLUDE = {
  ticket: {
    select: {
      id: true,
      title: true,
      ticketNumber: true,
      type: true,
      requester: { select: { name: true } },
    },
  },
  change: { select: { id: true, title: true, type: true } },
  flow: { select: { id: true, name: true, entityType: true } },
  approver: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ApprovalInclude;

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: RoutingRulesService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(actor: UserContext, query: QueryApprovalsDto) {
    const where: Prisma.ApprovalWhereInput = { approverId: actor.sub };
    if (query.status) where.status = query.status;

    const rows = await this.prisma.approval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: ENTITY_INCLUDE,
    });
    return rows.map((a) => this.mapApproval(a));
  }

  async approve(id: string, dto: ApproveDto, actor: UserContext) {
    return this.decide(id, ApprovalStatus.APPROVED, dto.comment ?? null, actor);
  }

  async reject(id: string, dto: RejectDto, actor: UserContext) {
    return this.decide(id, ApprovalStatus.REJECTED, dto.comment, actor);
  }

  async requestForTicket(flowId: string, ticketId: string, actor: UserContext) {
    const flow = await this.prisma.approvalFlow.findUnique({ where: { id: flowId } });
    if (!flow) {
      throw new UnprocessableEntityException({
        key: 'business.approval_flow_invalid',
        error: 'UnprocessableEntity',
      });
    }
    if (flow.status !== Status.ACTIVE) {
      throw new UnprocessableEntityException({
        key: 'business.approval_flow_inactive',
        error: 'UnprocessableEntity',
      });
    }
    if (flow.entityType !== 'TICKET') {
      throw new UnprocessableEntityException({
        key: 'business.approval_entity_mismatch',
        error: 'UnprocessableEntity',
      });
    }

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    if (flow.companyId !== ticket.companyId) {
      throw new UnprocessableEntityException({
        key: 'business.approval_flow_company',
        error: 'UnprocessableEntity',
      });
    }
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      throw new UnprocessableEntityException({
        key: 'business.approval_entity_closed',
        error: 'UnprocessableEntity',
      });
    }
    const inFlight = await this.prisma.approval.findFirst({
      where: { ticketId, status: 'PENDING' },
    });
    if (inFlight) {
      throw new UnprocessableEntityException({
        key: 'business.approval_in_approval',
        error: 'UnprocessableEntity',
      });
    }

    const stages = await this.resolveStages(flow.rules, ticket.companyId);
    const prevStatus = ticket.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.WAITING_APPROVAL },
      });
      await tx.ticketHistory.create({
        data: {
          field: 'status',
          oldValue: prevStatus,
          newValue: 'WAITING_APPROVAL',
          ticketId,
          userId: actor.sub,
        },
      });
      await tx.approval.createMany({
        data: stages.map((stage) => ({
          ticketId,
          flowId: flow.id,
          approverId: stage.approverId,
          order: stage.order,
          status: ApprovalStatus.PENDING,
          prevStatus,
        })),
      });
    });

    await this.emitApprovalsPending(
      { ticketId, flowName: flow.name, entityType: flow.entityType },
    );

    return {
      ticketId,
      flowName: flow.name,
      status: TicketStatus.WAITING_APPROVAL,
      stages: stages.map((s) => ({ order: s.order, approverId: s.approverId })),
      prevStatus,
    };
  }

  async requestForChange(flowId: string, changeId: string) {
    const flow = await this.prisma.approvalFlow.findUnique({ where: { id: flowId } });
    if (!flow) {
      throw new UnprocessableEntityException({
        key: 'business.approval_flow_invalid',
        error: 'UnprocessableEntity',
      });
    }
    if (flow.status !== Status.ACTIVE) {
      throw new UnprocessableEntityException({
        key: 'business.approval_flow_inactive',
        error: 'UnprocessableEntity',
      });
    }
    if (flow.entityType !== 'CHANGE') {
      throw new UnprocessableEntityException({
        key: 'business.approval_entity_mismatch',
        error: 'UnprocessableEntity',
      });
    }

    const change = await this.prisma.change.findUnique({ where: { id: changeId } });
    if (!change) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    if (flow.companyId !== change.companyId) {
      throw new UnprocessableEntityException({
        key: 'business.approval_flow_company',
        error: 'UnprocessableEntity',
      });
    }
    if (change.status === 'COMPLETED' || change.status === 'ROLLED_BACK') {
      throw new UnprocessableEntityException({
        key: 'business.approval_entity_closed',
        error: 'UnprocessableEntity',
      });
    }
    const inFlight = await this.prisma.approval.findFirst({
      where: { changeId, status: 'PENDING' },
    });
    if (inFlight) {
      throw new UnprocessableEntityException({
        key: 'business.approval_in_approval',
        error: 'UnprocessableEntity',
      });
    }

    const stages = await this.resolveStages(flow.rules, change.companyId);
    const prevStatus = change.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.change.update({
        where: { id: changeId },
        data: { status: ChangeStatus.PENDING_APPROVAL },
      });
      await tx.approval.createMany({
        data: stages.map((stage) => ({
          changeId,
          flowId: flow.id,
          approverId: stage.approverId,
          order: stage.order,
          status: ApprovalStatus.PENDING,
          prevStatus,
        })),
      });
    });

    await this.emitApprovalsPending(
      { changeId, flowName: flow.name, entityType: flow.entityType },
    );

    return {
      changeId,
      flowName: flow.name,
      status: ChangeStatus.PENDING_APPROVAL,
      stages: stages.map((s) => ({ order: s.order, approverId: s.approverId })),
      prevStatus,
    };
  }

  private async decide(
    id: string,
    result: ApprovalStatus,
    comment: string | null,
    actor: UserContext,
  ) {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
      include: {
        flow: { select: { id: true, name: true, entityType: true } },
        ticket: { select: { id: true, ticketNumber: true, type: true } },
        change: { select: { id: true } },
      },
    });
    if (!approval) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    if (approval.approverId !== actor.sub) {
      throw new ForbiddenException({
        key: 'business.approval_not_yours',
        error: 'Forbidden',
      });
    }
    if (approval.status !== ApprovalStatus.PENDING) {
      throw new UnprocessableEntityException({
        key: 'business.approval_not_pending',
        error: 'UnprocessableEntity',
      });
    }

    if (result === ApprovalStatus.APPROVED && approval.ticketId) {
      const priorPending = await this.prisma.approval.findFirst({
        where: { ticketId: approval.ticketId, status: 'PENDING', order: { lt: approval.order } },
        select: { order: true },
      });
      if (priorPending) {
        throw new UnprocessableEntityException({
          key: 'business.approval_stage_prior_pending',
          error: 'UnprocessableEntity',
          args: { order: priorPending.order },
        });
      }
    }
    if (result === ApprovalStatus.APPROVED && approval.changeId) {
      const priorPending = await this.prisma.approval.findFirst({
        where: { changeId: approval.changeId, status: 'PENDING', order: { lt: approval.order } },
        select: { order: true },
      });
      if (priorPending) {
        throw new UnprocessableEntityException({
          key: 'business.approval_stage_prior_pending',
          error: 'UnprocessableEntity',
          args: { order: priorPending.order },
        });
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.approval.update({
        where: { id },
        data: { status: result, comment },
      });

      if (approval.changeId) {
        if (result === ApprovalStatus.APPROVED) {
          await this.afterChangeApproved(tx, approval.changeId, row.comment);
        } else {
          await this.afterChangeRejected(tx, approval.changeId, row.comment);
        }
      } else if (approval.ticketId) {
        if (result === ApprovalStatus.APPROVED) {
          await this.afterTicketApproved(tx, approval.ticketId, actor.sub);
        } else {
          await this.afterTicketRejected(tx, approval.ticketId, actor.sub);
        }
      }
      return row;
    });

    await this.audit.log({
      action: result === ApprovalStatus.APPROVED ? 'APPROVE' : 'REJECT',
      entity: approval.ticketId ? 'Ticket' : 'Change',
      entityId: approval.ticketId ?? approval.changeId ?? null,
      userId: actor.sub,
      newData: {
        approvalId: updated.id,
        order: updated.order,
        entityType: approval.flow?.entityType ?? null,
        flow: approval.flow?.name ?? null,
        comment: updated.comment,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      order: updated.order,
      flowName: approval.flow?.name ?? null,
      entityType: approval.flow?.entityType ?? null,
      entity: approval.ticket
        ? {
            type: 'TICKET',
            id: approval.ticket?.id ?? null,
            reference: approval.ticket?.ticketNumber ?? null,
          }
        : approval.change
          ? { type: 'CHANGE', id: approval.change?.id ?? null }
          : null,
      decision: result === ApprovalStatus.APPROVED ? 'approved' : 'rejected',
      comment: updated.comment,
    };
  }

  private async afterChangeApproved(tx: Tx, changeId: string, _comment: string | null) {
    const remaining = await tx.approval.count({
      where: { changeId, status: 'PENDING' },
    });
    if (remaining > 0) return;

    const change = await tx.change.findUnique({ where: { id: changeId } });
    if (!change || change.status !== ChangeStatus.PENDING_APPROVAL) return;

    const next =
      change.scheduledAt != null
        ? ChangeStatus.SCHEDULED
        : ChangeStatus.APPROVED;
    await tx.change.update({
      where: { id: changeId },
      data: { status: next },
    });
  }

  private async afterChangeRejected(tx: Tx, changeId: string, _comment: string | null) {
    await tx.approval.updateMany({
      where: { changeId, status: 'PENDING' },
      data: { status: ApprovalStatus.REJECTED },
    });
    const change = await tx.change.findUnique({ where: { id: changeId } });
    if (!change || change.status !== ChangeStatus.PENDING_APPROVAL) return;
    await tx.change.update({
      where: { id: changeId },
      data: { status: ChangeStatus.REJECTED },
    });
  }

  private async afterTicketApproved(
    tx: Tx,
    ticketId: string,
    actorId: string,
  ) {
    const remaining = await tx.approval.count({
      where: { ticketId, status: 'PENDING' },
    });
    if (remaining > 0) return;

    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.status !== TicketStatus.WAITING_APPROVAL) return;

    const prev = await tx.approval.findFirst({
      where: { ticketId },
      select: { prevStatus: true },
    });
    const next = this.resumeStatus(prev?.prevStatus ?? null);
    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: next },
    });
    await tx.ticketHistory.create({
      data: {
        field: 'status',
        oldValue: 'WAITING_APPROVAL',
        newValue: next,
        ticketId,
        userId: actorId,
      },
    });

    await this.ensureAssignee(tx, ticket.id, ticket.type, ticket.priority);
  }

  private async afterTicketRejected(tx: Tx, ticketId: string, actorId: string) {
    await tx.approval.updateMany({
      where: { ticketId, status: 'PENDING' },
      data: { status: ApprovalStatus.REJECTED },
    });
    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.status !== TicketStatus.WAITING_APPROVAL) return;

    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.PENDING },
    });
    await tx.ticketHistory.create({
      data: {
        field: 'status',
        oldValue: 'WAITING_APPROVAL',
        newValue: 'PENDING',
        ticketId,
        userId: actorId,
      },
    });
  }

  private resumeStatus(prev: string | null): TicketStatus {
    const allowed: TicketStatus[] = [
      'OPEN',
      'IN_PROGRESS',
      'PENDING',
      'WAITING_USER',
    ];
    if (prev && (allowed as string[]).includes(prev)) return prev as TicketStatus;
    return TicketStatus.IN_PROGRESS;
  }

  private async ensureAssignee(
    tx: Tx,
    ticketId: string,
    type: TicketType,
    priority: Priority,
  ) {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: { assigneeId: true, solverGroupId: true },
    });
    if (!ticket || (ticket.assigneeId && ticket.solverGroupId)) return;

    const destination = await this.routing.resolveDestination(type, priority);
    if (!destination?.groupId) return;
    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        ...(ticket.solverGroupId ? {} : { solverGroupId: destination.groupId }),
        ...(ticket.assigneeId
          ? {}
          : destination.assigneeId
            ? { assigneeId: destination.assigneeId }
            : {}),
      },
    });
  }

  private async emitApprovalsPending(
    target: { ticketId?: string; changeId?: string; flowName: string; entityType: string },
  ) {
    const where = target.ticketId
      ? { ticketId: target.ticketId, status: ApprovalStatus.PENDING }
      : { changeId: target.changeId, status: ApprovalStatus.PENDING };
    const rows = await this.prisma.approval.findMany({
      where,
      select: { id: true, order: true, approverId: true },
    });
    for (const row of rows) {
      this.realtime.emitApprovalPending(row.approverId, {
        approvalId: row.id,
        order: row.order,
        flowName: target.flowName,
        entityType: target.entityType,
        ticketId: target.ticketId,
        changeId: target.changeId,
      });
    }
  }

  private async resolveStages(
    rules: unknown,
    companyId: string,
  ): Promise<Array<ApprovalStage & { approverId: string }>> {
    const stages = validateStages(rules);
    const out: Array<ApprovalStage & { approverId: string }> = [];
    for (const stage of stages) {
      const approverId = await this.resolveApprover(stage, companyId);
      if (!approverId) {
        throw new UnprocessableEntityException({
          key: 'business.approval_no_approver',
          error: 'UnprocessableEntity',
          args: { order: stage.order },
        });
      }
      out.push({ ...stage, approverId });
    }
    return out;
  }

  private async resolveApprover(
    stage: ApprovalStage,
    companyId: string,
  ): Promise<string | null> {
    if (stage.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: stage.userId } });
      return user && user.status === Status.ACTIVE ? user.id : null;
    }
    if (stage.solverGroupId) {
      const user = await this.prisma.user.findFirst({
        where: {
          solverGroupId: stage.solverGroupId,
          status: Status.ACTIVE,
          role: { in: [UserRole.AGENT, UserRole.MANAGER] },
        },
        orderBy: { name: 'asc' },
        select: { id: true },
      });
      return user?.id ?? null;
    }
    if (stage.approverRole) {
      const user = await this.prisma.user.findFirst({
        where: {
          role: stage.approverRole as UserRole,
          status: Status.ACTIVE,
          ...(stage.approverRole === 'USER'
            ? {}
            : companyId
              ? { OR: [{ companyId }, { companyId: null }] }
              : {}),
        },
        orderBy: { name: 'asc' },
        select: { id: true },
      });
      return user?.id ?? null;
    }
    return null;
  }

  private mapApproval(a: {
    id: string;
    status: string;
    order: number;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
    approver: { id: string; name: string; email: string } | null;
    flow: { id: string; name: string; entityType: string } | null;
    ticket?: {
      id: string;
      title: string;
      ticketNumber: string;
      type: string;
      requester?: { name: string } | null;
    } | null;
    change?: { id: string; title: string; type: string } | null;
  }) {
    return {
      id: a.id,
      status: a.status,
      order: a.order,
      comment: a.comment,
      flowName: a.flow?.name ?? null,
      entity: a.ticket
        ? {
            type: 'TICKET',
            id: a.ticket.id,
            reference: a.ticket.ticketNumber,
            title: a.ticket.title,
            requester: a.ticket.requester?.name ?? null,
          }
        : a.change
          ? { type: 'CHANGE', id: a.change.id, title: a.change.title }
          : null,
      approver: a.approver,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}