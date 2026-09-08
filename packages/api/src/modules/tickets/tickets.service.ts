import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  GroupLevel,
  Priority,
  Prisma,
  Status,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { SequenceService } from '../sequence/sequence.service.js';
import { SlaService } from '../sla/sla.service.js';
import { RoutingRulesService } from '../routing-rules/routing-rules.service.js';
import { paginationArgs, paginationMeta } from '../../common/dto/pagination.dto.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { QueryTicketsDto } from './dto/query-tickets.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { CreateCommentDto, UpdateTicketStatusDto } from './dto/status-comment.dto.js';

const TICKET_INCLUDE = {
  requester: { select: { id: true, name: true, email: true } },
  beneficiary: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true, solverGroupId: true } },
  solverGroup: { select: { id: true, name: true, level: true } },
  company: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

const DETAIL_INCLUDE = {
  ...TICKET_INCLUDE,
  approvals: {
    orderBy: [{ order: 'asc' }],
    include: {
      approver: { select: { id: true, name: true, email: true } },
      flow: { select: { id: true, name: true } },
    },
  },
  comments: {
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, name: true, role: true } } },
  },
  history: {
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true } } },
  },
  attachments: { orderBy: { createdAt: 'asc' } },
  problems: { include: { problem: { select: { id: true, title: true, status: true } } } },
  changes: { include: { change: { select: { id: true, title: true, status: true } } } },
} satisfies Prisma.TicketInclude;

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'PENDING', 'WAITING_USER', 'WAITING_APPROVAL', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['PENDING', 'WAITING_USER', 'WAITING_APPROVAL', 'RESOLVED', 'CLOSED', 'OPEN'],
  PENDING: ['IN_PROGRESS', 'WAITING_USER', 'WAITING_APPROVAL', 'RESOLVED', 'CLOSED'],
  WAITING_USER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  WAITING_APPROVAL: ['IN_PROGRESS', 'PENDING', 'WAITING_USER', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'OPEN', 'IN_PROGRESS'],
  CLOSED: ['OPEN', 'IN_PROGRESS'],
};

const REOPEN_WINDOW_MS = 24 * 60 * 60 * 1000;

const LEVEL_RANK: Record<GroupLevel, number> = {
  N1: 1,
  N2: 2,
  N3: 3,
  N4: 4,
  REDES: 2,
  INFRA: 2,
  DEVOPS: 2,
  DATABASE: 2,
  SECURITY: 2,
};

const OPEN_QUEUE_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'PENDING'];

type TicketRow = Prisma.TicketGetPayload<{ include: typeof DETAIL_INCLUDE }>;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequence: SequenceService,
    private readonly sla: SlaService,
    private readonly routing: RoutingRulesService,
  ) {}

  async findAll(query: QueryTicketsDto, actor: UserContext) {
    const { page = 1, pageSize = 20, ...filters } = query as QueryTicketsDto & {
      page?: number;
      pageSize?: number;
    };

    const where: Prisma.TicketWhereInput = this.buildWhere(filters, actor);
    const direction = (filters.order ?? 'DESC').toLowerCase() as 'asc' | 'desc';
    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      {
        [filters.sortBy ?? 'createdAt']: direction,
      } as Prisma.TicketOrderByWithRelationInput,
      { createdAt: 'desc' },
    ];

    const [rows, totalItems] = await Promise.all([
      this.prisma.ticket.findMany({
        ...paginationArgs(page, pageSize),
        where,
        orderBy,
        include: TICKET_INCLUDE,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: rows.map((t) => this.mapListItem(t)),
      pagination: paginationMeta(page, pageSize, totalItems),
    };
  }

  async create(dto: CreateTicketDto, actor: UserContext) {
    const requester = await this.prisma.user.findUnique({ where: { id: actor.sub } });
    if (!requester || requester.status !== Status.ACTIVE) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    if (!requester.companyId) {
      throw new UnprocessableEntityException({
        key: 'business.ticket_requires_company',
        error: 'UnprocessableEntity',
      });
    }

    const beneficiaryId = await this.resolveBeneficiary(
      dto.beneficiaryId ?? requester.id,
      requester.id,
      requester.companyId,
    );

    const isTeam = actor.role === 'AGENT' || actor.role === 'MANAGER' || actor.role === 'ADMIN';
    const priority = dto.priority && isTeam ? dto.priority : Priority.MEDIUM;
    const impact = dto.impact && isTeam ? dto.impact : 'MEDIUM';
    const urgency = dto.urgency && isTeam ? dto.urgency : 'MEDIUM';

    const { slaResponseAt, slaResolveAt } = await this.sla.calculate(dto.type, priority);
    const { formatted: ticketNumber } = await this.sequence.next('TICKET', requester.companyId);

    const destination = await this.routing.resolveDestination(dto.type, priority);

    const assigneeId = destination?.assigneeId ?? null;
    const solverGroupId = destination?.groupId ?? null;
    const status: TicketStatus = assigneeId ? 'IN_PROGRESS' : 'OPEN';

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status,
        priority,
        impact,
        urgency,
        slaResponseAt,
        slaResolveAt,
        requesterId: requester.id,
        beneficiaryId,
        companyId: requester.companyId,
        solverGroupId,
        assigneeId,
        routedByAuto: destination !== null,
        routedStrategy: destination?.strategy ?? null,
        routedRuleId: destination?.routingRuleId ?? null,
      },
      include: DETAIL_INCLUDE,
    });

    await this.recordHistory(ticket.id, actor.sub, [
      { field: 'status', oldValue: null, newValue: status },
      ...(solverGroupId
        ? [{ field: 'solverGroupId', oldValue: null, newValue: solverGroupId }]
        : []),
      ...(assigneeId ? [{ field: 'assigneeId', oldValue: null, newValue: assigneeId }] : []),
    ]);

    return this.mapDetail(ticket, actor);
  }

  async findOne(id: string, actor: UserContext) {
    const ticket = await this.getTicketDetail(id);
    if (!this.isVisible(ticket, actor)) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return this.mapDetail(ticket, actor);
  }

  async update(id: string, dto: UpdateTicketDto, actor: UserContext) {
    if (actor.role === 'USER') {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }
    const priorityAllowed = actor.role === 'ADMIN' || actor.role === 'MANAGER';
    if ((dto.priority || dto.impact || dto.urgency) && !priorityAllowed) {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }

    const prev = await this.getTicketDetail(id);

    const history: { field: string; oldValue?: string | null; newValue?: string | null }[] = [];
    const data: Prisma.TicketUncheckedUpdateInput = {};

    if (dto.title && dto.title !== prev.title) {
      data.title = dto.title;
      history.push({ field: 'title', oldValue: prev.title, newValue: dto.title });
    }
    if (dto.description !== undefined && dto.description !== prev.description) {
      data.description = dto.description;
      history.push({ field: 'description', oldValue: prev.description, newValue: dto.description });
    }
    if (dto.priority && dto.priority !== prev.priority) {
      data.priority = dto.priority;
      history.push({ field: 'priority', oldValue: prev.priority, newValue: dto.priority });
      const sla = await this.sla.calculate(prev.type, dto.priority);
      data.slaResponseAt = sla.slaResponseAt;
      data.slaResolveAt = sla.slaResolveAt;
      history.push({
        field: 'slaResponseAt',
        oldValue: prev.slaResponseAt?.toISOString(),
        newValue: sla.slaResponseAt.toISOString(),
      });
      history.push({
        field: 'slaResolveAt',
        oldValue: prev.slaResolveAt?.toISOString(),
        newValue: sla.slaResolveAt.toISOString(),
      });
    }

    if (history.length === 0) {
      return this.mapDetail(prev, actor);
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
      include: DETAIL_INCLUDE,
    });
    await this.recordHistory(id, actor.sub, history);
    return this.mapDetail(updated, actor);
  }

  async assign(
    id: string,
    assigneeId: string | undefined,
    solverGroupId: string | undefined,
    actor: UserContext,
  ) {
    return this.applyAssignment(id, { assigneeId, solverGroupId }, actor);
  }

  async pickup(id: string, solverGroupId: string, actor: UserContext) {
    if (actor.role !== 'AGENT') {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }
    if (!actor.solverGroupId || actor.solverGroupId !== solverGroupId) {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }

    const ticket = await this.getTicketDetail(id);
    if (ticket.assigneeId) {
      throw new UnprocessableEntityException({
        key: 'business.ticket_already_claimed',
        error: 'UnprocessableEntity',
      });
    }
    if (ticket.solverGroupId !== solverGroupId) {
      throw new UnprocessableEntityException({
        key: 'business.ticket_not_in_queue',
        error: 'UnprocessableEntity',
      });
    }

    return this.applyAssignment(id, { assigneeId: actor.sub, solverGroupId }, actor, {
      skipGroupValidation: true,
    });
  }

  async reassign(
    ticketIds: string[],
    assigneeId: string | undefined,
    solverGroupId: string | undefined,
    actor: UserContext,
  ) {
    if (!assigneeId && !solverGroupId) {
      throw new BadRequestException({
        key: 'business.routing_target_required',
        error: 'BadRequest',
      });
    }
    const results = [];
    for (const id of ticketIds) {
      results.push(await this.applyAssignment(id, { assigneeId, solverGroupId }, actor));
    }
    return { updated: results.length };
  }

  async unassigned(actor: UserContext) {
    if (actor.role === 'USER') {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }
    const rows = await this.prisma.ticket.findMany({
      where: {
        solverGroupId: actor.solverGroupId ?? undefined,
        assigneeId: null,
        status: { in: OPEN_QUEUE_STATUSES },
      },
      orderBy: { createdAt: 'asc' },
      include: TICKET_INCLUDE,
    });
    return { items: rows.map((t) => this.mapListItem(t)) };
  }

  async changeStatus(id: string, dto: UpdateTicketStatusDto, actor: UserContext) {
    const ticket = await this.getTicketDetail(id);

    const isTeam = actor.role === 'AGENT' || actor.role === 'MANAGER' || actor.role === 'ADMIN';
    const isParticipant = this.isParticipant(ticket, actor.sub);

    if (dto.status === ticket.status) {
      throw new UnprocessableEntityException({
        key: 'business.invalid_transition',
        error: 'UnprocessableEntity',
        args: { from: String(ticket.status), to: String(dto.status) },
      });
    }

    if (!(TRANSITIONS[ticket.status] ?? []).includes(dto.status)) {
      throw new UnprocessableEntityException({
        key: 'business.invalid_transition',
        error: 'UnprocessableEntity',
        args: { from: String(ticket.status), to: String(dto.status) },
      });
    }

    if (!isTeam) {
      if (!isParticipant) {
        throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
      }
      const participantAllowed =
        (ticket.status === 'RESOLVED' && dto.status === 'CLOSED') ||
        (ticket.status === 'CLOSED' && (dto.status === 'OPEN' || dto.status === 'IN_PROGRESS'));
      if (!participantAllowed) {
        throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
      }
    }

    const reopening = ticket.status === 'CLOSED' && (dto.status === 'OPEN' || dto.status === 'IN_PROGRESS');
    if (
      reopening &&
      ticket.closedAt &&
      Date.now() - ticket.closedAt.getTime() > REOPEN_WINDOW_MS &&
      actor.role !== 'ADMIN' &&
      actor.role !== 'MANAGER'
    ) {
      throw new UnprocessableEntityException({
        key: 'business.reopen_window',
        error: 'UnprocessableEntity',
      });
    }

    const data: Prisma.TicketUncheckedUpdateInput = {
      status: dto.status,
      ...(dto.status === 'RESOLVED' && !ticket.resolvedAt
        ? { resolvedAt: new Date() }
        : {}),
      ...(dto.status === 'CLOSED' && !ticket.closedAt ? { closedAt: new Date() } : {}),
    };

    const history: { field: string; oldValue?: string | null; newValue?: string | null }[] = [
      { field: 'status', oldValue: ticket.status, newValue: dto.status },
    ];
    if (dto.resolutionNote) {
      history.push({
        field: 'resolutionNote',
        oldValue: null,
        newValue: dto.resolutionNote,
      });
    }

    const updated = await this.prisma.ticket.update({ where: { id }, data, include: DETAIL_INCLUDE });
    await this.recordHistory(id, actor.sub, history);
    return this.mapDetail(updated, actor);
  }

  async addComment(id: string, dto: CreateCommentDto, actor: UserContext) {
    const ticket = await this.getTicketDetail(id);
    if (ticket.status === 'CLOSED') {
      throw new UnprocessableEntityException({
        key: 'business.ticket_closed',
        error: 'UnprocessableEntity',
      });
    }

    const isParticipant = this.isParticipant(ticket, actor.sub);
    const isTeam = this.isTeamMember(actor, ticket);

    if (dto.visibility === 'INTERNAL') {
      if (!isTeam) {
        throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
      }
    } else {
      if (!isParticipant && !isTeam) {
        throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
      }
    }

    const comment = await this.prisma.ticketComment.create({
      data: {
        content: dto.content,
        visibility: dto.visibility,
        ticketId: id,
        authorId: actor.sub,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
    return comment;
  }

  async addAttachment(
    id: string,
    file: { filename: string; url: string; size: number; mimetype: string },
    actor: UserContext,
  ) {
    const ticket = await this.getTicketDetail(id);
    if (!this.isVisible(ticket, actor)) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return this.prisma.attachment.create({
      data: { ...file, ticketId: id },
    });
  }

  async getAttachment(id: string, attachmentId: string, actor: UserContext) {
    const ticket = await this.getTicketDetail(id);
    if (!this.isVisible(ticket, actor)) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return this.prisma.attachment.findFirst({
      where: { id: attachmentId, ticketId: id },
    });
  }

  private async applyAssignment(
    id: string,
    targets: { assigneeId?: string; solverGroupId?: string },
    actor: UserContext,
    opts?: { skipGroupValidation?: boolean },
  ) {
    const { assigneeId, solverGroupId } = targets;
    if (!assigneeId && !solverGroupId) {
      throw new BadRequestException({
        key: 'business.routing_target_required',
        error: 'BadRequest',
      });
    }

    const prev = await this.getTicketDetail(id);
    const data: Prisma.TicketUncheckedUpdateInput = {};
    const history: { field: string; oldValue?: string | null; newValue?: string | null }[] = [];

    if (solverGroupId) {
      const group = await this.prisma.solverGroup.findUnique({ where: { id: solverGroupId } });
      if (!group || group.status !== Status.ACTIVE) {
        throw new UnprocessableEntityException({
          key: 'business.group_inactive',
          error: 'UnprocessableEntity',
        });
      }
      if (
        actor.role === 'AGENT' &&
        prev.solverGroupId &&
        prev.solverGroupId !== group.id &&
        !opts?.skipGroupValidation
      ) {
        const current = await this.prisma.solverGroup.findUnique({
          where: { id: prev.solverGroupId },
          select: { level: true },
        });
        if (current && LEVEL_RANK[group.level] < LEVEL_RANK[current.level]) {
          throw new UnprocessableEntityException({
            key: 'business.escalation_only',
            error: 'UnprocessableEntity',
          });
        }
      }
      data.solverGroupId = group.id;
      history.push({ field: 'solverGroupId', oldValue: prev.solverGroupId, newValue: group.id });
    }

    if (assigneeId) {
      const agent = await this.prisma.user.findUnique({ where: { id: assigneeId } });
      if (!agent || agent.role !== 'AGENT' || agent.status !== Status.ACTIVE) {
        throw new UnprocessableEntityException({
          key: 'business.agent_inactive',
          error: 'UnprocessableEntity',
        });
      }
      if (solverGroupId && agent.solverGroupId !== solverGroupId) {
        throw new UnprocessableEntityException({
          key: 'business.agent_not_in_group',
          error: 'UnprocessableEntity',
        });
      }
      if (agent.solverGroupId) {
        data.solverGroupId = agent.solverGroupId;
        history.push({
          field: 'solverGroupId',
          oldValue: prev.solverGroupId,
          newValue: agent.solverGroupId,
        });
      }
      data.assigneeId = agent.id;
      history.push({ field: 'assigneeId', oldValue: prev.assigneeId, newValue: agent.id });
    }

    data.routedByAuto = false;
    data.routedStrategy = null;
    data.routedRuleId = null;

    if (prev.status === 'OPEN') {
      data.status = 'IN_PROGRESS';
      history.push({ field: 'status', oldValue: 'OPEN', newValue: 'IN_PROGRESS' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const h of history) {
        await tx.ticketHistory.create({
          data: { field: h.field, oldValue: h.oldValue, newValue: h.newValue, ticketId: id, userId: actor.sub },
        });
      }
      return tx.ticket.update({ where: { id }, data, include: DETAIL_INCLUDE });
    });

    return this.mapDetail(updated, actor);
  }

  private async resolveBeneficiary(
    beneficiaryId: string,
    requesterId: string,
    companyId: string,
  ): Promise<string> {
    if (beneficiaryId === requesterId) return requesterId;
    const beneficiary = await this.prisma.user.findUnique({ where: { id: beneficiaryId } });
    if (!beneficiary) {
      throw new UnprocessableEntityException({
        key: 'business.beneficiary_invalid',
        error: 'UnprocessableEntity',
      });
    }
    if (beneficiary.companyId !== companyId) {
      throw new UnprocessableEntityException({
        key: 'business.beneficiary_invalid',
        error: 'UnprocessableEntity',
      });
    }
    return beneficiary.id;
  }

  private buildWhere(filters: QueryTicketsDto, actor: UserContext): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.ticketNumber) where.ticketNumber = filters.ticketNumber;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.requesterId) where.requesterId = filters.requesterId;
    if (filters.beneficiaryId) where.beneficiaryId = filters.beneficiaryId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.solverGroupId) where.solverGroupId = filters.solverGroupId;

    if (filters.slaBreached) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { status: { notIn: ['RESOLVED', 'CLOSED'] } },
        { OR: [{ slaResolveAt: { lt: new Date() } }, { slaResponseAt: { lt: new Date() } }] },
      ];
    }
    if (filters.unassigned) {
      where.assigneeId = null;
      where.status = { in: OPEN_QUEUE_STATUSES };
    }

    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), this.visibilityScope(actor)];
    return where;
  }

  private visibilityScope(actor: UserContext): Prisma.TicketWhereInput {
    if (actor.role === 'ADMIN') return {};
    if (actor.role === 'USER') {
      return { OR: [{ requesterId: actor.sub }, { beneficiaryId: actor.sub }] };
    }
    if (actor.role === 'MANAGER') {
      return {
        OR: [
          ...(actor.companyId ? [{ companyId: actor.companyId }] : []),
          { requesterId: actor.sub },
          { beneficiaryId: actor.sub },
        ],
      };
    }
    return {
      OR: [
        ...(actor.solverGroupId ? [{ solverGroupId: actor.solverGroupId }] : []),
        { assigneeId: actor.sub },
      ],
    };
  }

  private isVisible(ticket: TicketRow, actor: UserContext): boolean {
    if (actor.role === 'ADMIN') return true;
    if (actor.role === 'USER') {
      return ticket.requesterId === actor.sub || ticket.beneficiaryId === actor.sub;
    }
    if (actor.role === 'MANAGER') {
      return (
        (actor.companyId != null && ticket.companyId === actor.companyId) ||
        ticket.requesterId === actor.sub ||
        ticket.beneficiaryId === actor.sub
      );
    }
    return (
      (ticket.solverGroupId != null && ticket.solverGroupId === actor.solverGroupId) ||
      ticket.assigneeId === actor.sub
    );
  }

  private isParticipant(ticket: TicketRow, userId: string): boolean {
    return (
      ticket.requesterId === userId ||
      ticket.beneficiaryId === userId ||
      (ticket.approvals ?? []).some((a) => a.approverId === userId)
    );
  }

  private isTeamMember(actor: UserContext, ticket: TicketRow): boolean {
    if (this.isParticipant(ticket, actor.sub)) return false;
    if (actor.role === 'USER') return false;
    if (actor.role === 'ADMIN' || actor.role === 'MANAGER') return true;
    return ticket.solverGroupId != null && ticket.solverGroupId === actor.solverGroupId;
  }

  private isSlaBreached(t: { slaResolveAt: Date | null; status: TicketStatus }): boolean {
    return (
      t.slaResolveAt != null &&
      t.status !== 'RESOLVED' &&
      t.status !== 'CLOSED' &&
      t.slaResolveAt.getTime() < Date.now()
    );
  }

  private mapListItem(t: Prisma.TicketGetPayload<{ include: typeof TICKET_INCLUDE }>) {
    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      type: t.type,
      status: t.status,
      priority: t.priority,
      impact: t.impact,
      urgency: t.urgency,
      slaResponseAt: t.slaResponseAt,
      slaResolveAt: t.slaResolveAt,
      slaBreached: this.isSlaBreached(t),
      requester: t.requester ? { id: t.requester.id, name: t.requester.name } : null,
      beneficiary: t.beneficiary
        ? { id: t.beneficiary.id, name: t.beneficiary.name }
        : null,
      assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
      solverGroup: t.solverGroup ? { id: t.solverGroup.id, name: t.solverGroup.name } : null,
      company: t.company ? { id: t.company.id, name: t.company.name } : null,
      createdAt: t.createdAt,
      resolvedAt: t.resolvedAt,
    };
  }

  private mapDetail(t: TicketRow, actor: UserContext) {
    const isParticipant = this.isParticipant(t, actor.sub);
    const comments = (t.comments ?? []).filter(
      (c) => c.visibility === 'PUBLIC' || !isParticipant,
    );

    const timeline = {
      createdAt: t.createdAt,
      firstResponseAt: this.firstResponseAt(t),
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
    };

    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      description: t.description,
      type: t.type,
      status: t.status,
      priority: t.priority,
      impact: t.impact,
      urgency: t.urgency,
      slaResponseAt: t.slaResponseAt,
      slaResolveAt: t.slaResolveAt,
      slaBreached: this.isSlaBreached(t),
      requester: t.requester ? { id: t.requester.id, name: t.requester.name } : null,
      beneficiary: t.beneficiary
        ? { id: t.beneficiary.id, name: t.beneficiary.name }
        : null,
      assignee: t.assignee
        ? { id: t.assignee.id, name: t.assignee.name, solverGroupId: t.assignee.solverGroupId }
        : null,
      solverGroup: t.solverGroup
        ? { id: t.solverGroup.id, name: t.solverGroup.name, level: t.solverGroup.level }
        : null,
      company: t.company ? { id: t.company.id, name: t.company.name } : null,
      routedBy: {
        auto: t.routedByAuto,
        strategy: t.routedStrategy,
        routingRuleId: t.routedRuleId,
        appliedAt: t.createdAt,
      },
      approvals: (t.approvals ?? []).map((a) => ({
        id: a.id,
        status: a.status,
        order: a.order,
        comment: a.comment,
        approver: a.approver ? { id: a.approver.id, name: a.approver.name } : null,
        flowName: a.flow?.name ?? null,
      })),
      timeline,
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        visibility: c.visibility,
        author: { id: c.author?.id, name: c.author?.name },
        createdAt: c.createdAt,
      })),
      history: (t.history ?? []).map((h) => ({
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
        userId: h.userId,
        createdAt: h.createdAt,
      })),
      attachments: (t.attachments ?? []).map((a) => ({
        id: a.id,
        filename: a.filename,
        url: a.url,
        size: a.size,
        mimetype: a.mimetype,
        createdAt: a.createdAt,
      })),
      relatedProblem: t.problems.length > 0 ? t.problems[0].problem : null,
      relatedChanges: t.changes.map((c) => c.change),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
    };
  }

  private firstResponseAt(t: TicketRow): Date | null {
    const transition = (t.history ?? []).find(
      (h) => h.field === 'status' && h.newValue === 'IN_PROGRESS',
    );
    return transition?.createdAt ?? null;
  }

  private async recordHistory(
    ticketId: string,
    userId: string,
    entries: { field: string; oldValue?: string | null; newValue?: string | null }[],
  ) {
    if (entries.length === 0) return;
    await this.prisma.ticketHistory.createMany({
      data: entries.map((e) => ({
        field: e.field,
        oldValue: e.oldValue ?? null,
        newValue: e.newValue ?? null,
        ticketId,
        userId,
      })),
    });
  }

  private async getTicketDetail(id: string): Promise<TicketRow> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!ticket) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return ticket;
  }
}