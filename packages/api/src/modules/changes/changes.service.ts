import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ChangeStatus, Prisma, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  paginationArgs,
  paginationMeta,
} from '../../common/dto/pagination.dto.js';
import { ApprovalsService } from '../approvals/approvals.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import {
  CreateChangeDto,
  LinkChangeTicketDto,
  QueryChangesDto,
  UpdateChangeDto,
} from './dto/change.dto.js';

const CHANGE_INCLUDE = {
  company: { select: { id: true, name: true } },
  requester: { select: { id: true, name: true, email: true } },
  solverGroup: { select: { id: true, name: true } },
  problemProposal: { select: { id: true, title: true, status: true } },
} satisfies Prisma.ChangeInclude;

const DETAIL_INCLUDE = {
  ...CHANGE_INCLUDE,
  approvals: {
    orderBy: { order: 'asc' },
    include: {
      approver: { select: { id: true, name: true, email: true } },
      flow: { select: { id: true, name: true } },
    },
  },
  tickets: {
    orderBy: { createdAt: 'desc' },
    include: {
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          type: true,
          status: true,
          priority: true,
        },
      },
    },
  },
} satisfies Prisma.ChangeInclude;

const LOCKED_STATUSES: ChangeStatus[] = [
  'PENDING_APPROVAL',
  'IN_PROGRESS',
  'COMPLETED',
  'ROLLED_BACK',
];

type ChangeRow = Prisma.ChangeGetPayload<{ include: typeof DETAIL_INCLUDE }>;

@Injectable()
export class ChangesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: QueryChangesDto, actor: UserContext) {
    this.assertTeam(actor);
    const where: Prisma.ChangeWhereInput = this.visibilityScope(actor);
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.change.findMany({
        ...paginationArgs(1, 50),
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          ...CHANGE_INCLUDE,
          approvals: {
            select: { status: true },
          },
        },
      }),
      this.prisma.change.count({ where }),
    ]);

    return {
      items: rows.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        status: c.status,
        risk: c.risk,
        reason: c.reason,
        plan: c.plan,
        rollbackPlan: c.rollbackPlan,
        scheduledAt: c.scheduledAt,
        company: c.company,
        requester: c.requester,
        solverGroup: c.solverGroup,
        problem: c.problemProposal,
        approvalsPending: c.approvals.filter((a) => a.status === 'PENDING')
          .length,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pagination: paginationMeta(1, 50, totalItems),
    };
  }

  async findOne(id: string, actor: UserContext) {
    const change = await this.getDetail(id);
    if (!this.isVisible(change, actor)) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    return this.mapDetail(change);
  }

  async create(dto: CreateChangeDto, actor: UserContext) {
    this.assertTeam(actor);
    const companyId = await this.resolveCompany(dto.companyId, actor);
    if (dto.solverGroupId) {
      await this.assertSolverGroup(dto.solverGroupId, companyId);
    }

    const change = await this.prisma.change.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type ?? 'STANDARD',
        risk: dto.risk ?? 'LOW',
        reason: dto.reason,
        plan: dto.plan,
        rollbackPlan: dto.rollbackPlan,
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.solverGroupId ? { solverGroupId: dto.solverGroupId } : {}),
        companyId,
        requesterId: actor.sub,
      },
      include: DETAIL_INCLUDE,
    });
    await this.audit.log({
      action: 'CREATE',
      entity: 'Change',
      entityId: change.id,
      userId: actor.sub,
      newData: {
        title: change.title,
        type: change.type,
        risk: change.risk,
        status: change.status,
        companyId: change.companyId,
      },
    });
    return this.mapDetail(change);
  }

  async update(id: string, dto: UpdateChangeDto, actor: UserContext) {
    this.assertTeam(actor);
    const prev = await this.getDetail(id);
    if (!this.isVisible(prev, actor)) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    if (LOCKED_STATUSES.includes(prev.status)) {
      throw new UnprocessableEntityException({
        key: 'business.change_locked',
        error: 'UnprocessableEntity',
        args: { status: prev.status },
      });
    }
    if (dto.solverGroupId) {
      await this.assertSolverGroup(dto.solverGroupId, prev.companyId);
    }

    const nextScheduledAt = dto.scheduledAt
      ? new Date(dto.scheduledAt)
      : undefined;
    const updated = await this.prisma.change.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.risk ? { risk: dto.risk } : {}),
        ...(dto.reason ? { reason: dto.reason } : {}),
        ...(dto.plan ? { plan: dto.plan } : {}),
        ...(dto.rollbackPlan ? { rollbackPlan: dto.rollbackPlan } : {}),
        ...(dto.solverGroupId ? { solverGroupId: dto.solverGroupId } : {}),
        ...(nextScheduledAt ? { scheduledAt: nextScheduledAt } : {}),
        ...(nextScheduledAt && prev.status === 'APPROVED'
          ? { status: ChangeStatus.SCHEDULED }
          : {}),
      },
      include: DETAIL_INCLUDE,
    });
    await this.audit.log({
      action: 'UPDATE',
      entity: 'Change',
      entityId: id,
      userId: actor.sub,
      oldData: {
        title: prev.title,
        type: prev.type,
        risk: prev.risk,
        status: prev.status,
      },
      newData: {
        title: updated.title,
        type: updated.type,
        risk: updated.risk,
        status: updated.status,
      },
    });
    return this.mapDetail(updated);
  }

  async submit(id: string, actor: UserContext) {
    this.assertTeam(actor);
    const change = await this.getDetail(id);
    if (!this.isVisible(change, actor)) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    if (change.status !== 'DRAFT') {
      throw new UnprocessableEntityException({
        key: 'business.change_submit_status',
        error: 'UnprocessableEntity',
      });
    }

    if (change.type === 'STANDARD') {
      const updated = await this.prisma.change.update({
        where: { id },
        data: { status: ChangeStatus.SCHEDULED },
        include: DETAIL_INCLUDE,
      });
      await this.audit.log({
        action: 'SUBMIT',
        entity: 'Change',
        entityId: id,
        userId: actor.sub,
        oldData: { status: change.status },
        newData: { status: updated.status },
      });
      return this.mapDetail(updated);
    }

    const flow = await this.prisma.approvalFlow.findFirst({
      where: {
        companyId: change.companyId,
        entityType: 'CHANGE',
        status: Status.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!flow) {
      throw new UnprocessableEntityException({
        key: 'business.change_requires_approval',
        error: 'UnprocessableEntity',
      });
    }

    await this.approvals.requestForChange(flow.id, change.id);
    await this.audit.log({
      action: 'SUBMIT',
      entity: 'Change',
      entityId: id,
      userId: actor.sub,
      oldData: { status: change.status },
      newData: { status: 'PENDING_APPROVAL', flowId: flow.id },
    });
    return this.findOne(id, actor);
  }

  async execute(id: string, actor: UserContext) {
    this.assertTeam(actor);
    const change = await this.getDetail(id);
    if (!this.isVisible(change, actor)) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    if (change.status === 'SCHEDULED' || change.status === 'APPROVED') {
      const updated = await this.prisma.change.update({
        where: { id },
        data: { status: ChangeStatus.IN_PROGRESS },
        include: DETAIL_INCLUDE,
      });
      await this.audit.log({
        action: 'EXECUTE',
        entity: 'Change',
        entityId: id,
        userId: actor.sub,
        oldData: { status: change.status },
        newData: { status: updated.status },
      });
      return this.mapDetail(updated);
    }
    if (change.status === 'IN_PROGRESS') {
      const updated = await this.prisma.change.update({
        where: { id },
        data: { status: ChangeStatus.COMPLETED },
        include: DETAIL_INCLUDE,
      });
      await this.audit.log({
        action: 'EXECUTE',
        entity: 'Change',
        entityId: id,
        userId: actor.sub,
        oldData: { status: change.status },
        newData: { status: updated.status },
      });
      return this.mapDetail(updated);
    }
    throw new UnprocessableEntityException({
      key: 'business.change_execute_status',
      error: 'UnprocessableEntity',
      args: { status: change.status },
    });
  }

  async rollback(id: string, actor: UserContext) {
    this.assertTeam(actor);
    const change = await this.getDetail(id);
    if (!this.isVisible(change, actor)) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    if (change.status !== 'IN_PROGRESS') {
      throw new UnprocessableEntityException({
        key: 'business.change_rollback_status',
        error: 'UnprocessableEntity',
      });
    }
    const updated = await this.prisma.change.update({
      where: { id },
      data: { status: ChangeStatus.ROLLED_BACK },
      include: DETAIL_INCLUDE,
    });
    await this.audit.log({
      action: 'ROLLBACK',
      entity: 'Change',
      entityId: id,
      userId: actor.sub,
      oldData: { status: change.status },
      newData: { status: updated.status },
    });
    return this.mapDetail(updated);
  }

  async linkTicket(id: string, dto: LinkChangeTicketDto, actor: UserContext) {
    this.assertTeam(actor);
    const change = await this.getDetail(id);
    if (!this.isVisible(change, actor)) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
    });
    if (!ticket || ticket.companyId !== change.companyId) {
      throw new UnprocessableEntityException({
        key: 'business.ticket_link_invalid',
        error: 'UnprocessableEntity',
      });
    }
    const existing = await this.prisma.changeTicket.findFirst({
      where: { changeId: id, ticketId: ticket.id },
    });
    if (!existing) {
      await this.prisma.changeTicket.create({
        data: { changeId: id, ticketId: ticket.id },
      });
    }
    await this.audit.log({
      action: 'LINK',
      entity: 'Change',
      entityId: id,
      userId: actor.sub,
      newData: { ticketId: ticket.id },
    });
    return this.findOne(id, actor);
  }

  async proposeFromProblem(problemId: string, actor: UserContext) {
    this.assertTeam(actor);
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        title: true,
        description: true,
        solution: true,
        companyId: true,
        status: true,
        proposedChangeId: true,
      },
    });
    if (!problem || !this.isCompanyVisible(problem.companyId, actor)) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    if (problem.proposedChangeId) {
      throw new UnprocessableEntityException({
        key: 'business.problem_has_proposal',
        error: 'UnprocessableEntity',
      });
    }

    const changeId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.change.create({
        data: {
          title: `Proposta: ${problem.title}`,
          description: problem.description,
          type: 'NORMAL',
          risk: 'MEDIUM',
          reason: `Proposta criada a partir do problema resolvido "${problem.title}"`,
          plan: problem.solution ?? 'Definir plano de implementação',
          rollbackPlan: 'Reverter alterações conforme análise preliminar',
          companyId: problem.companyId,
          requesterId: actor.sub,
          problemProposal: { connect: { id: problem.id } },
        },
      });
      return created.id;
    });

    await this.audit.log({
      action: 'CREATE',
      entity: 'Change',
      entityId: changeId,
      userId: actor.sub,
      newData: { sourceProblemId: problem.id, type: 'NORMAL', status: 'DRAFT' },
    });

    const full = await this.prisma.change.findFirst({
      where: { problemProposal: { is: { id: problem.id } } },
      include: DETAIL_INCLUDE,
    });
    if (!full) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    return this.mapDetail(full);
  }

  private mapDetail(change: ChangeRow) {
    return {
      id: change.id,
      title: change.title,
      description: change.description,
      type: change.type,
      status: change.status,
      risk: change.risk,
      reason: change.reason,
      plan: change.plan,
      rollbackPlan: change.rollbackPlan,
      scheduledAt: change.scheduledAt,
      company: change.company,
      requester: change.requester,
      solverGroup: change.solverGroup,
      problem: change.problemProposal,
      approvals: change.approvals.map((a) => ({
        id: a.id,
        order: a.order,
        status: a.status,
        comment: a.comment,
        flowName: a.flow?.name ?? null,
        approver: a.approver,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      linkedTickets: (change.tickets ?? []).map((t) => ({
        id: t.ticket.id,
        ticketNumber: t.ticket.ticketNumber,
        title: t.ticket.title,
        type: t.ticket.type,
        status: t.ticket.status,
        priority: t.ticket.priority,
      })),
      createdAt: change.createdAt,
      updatedAt: change.updatedAt,
    };
  }

  private assertTeam(actor: UserContext) {
    if (actor.role === 'USER') {
      throw new ForbiddenException({
        key: 'errors.forbidden',
        error: 'Forbidden',
      });
    }
  }

  private isCompanyVisible(companyId: string, actor: UserContext): boolean {
    if (actor.role === 'ADMIN') return true;
    return actor.companyId != null && companyId === actor.companyId;
  }

  private isVisible(
    change: { companyId: string },
    actor: UserContext,
  ): boolean {
    return this.isCompanyVisible(change.companyId, actor);
  }

  private visibilityScope(actor: UserContext): Prisma.ChangeWhereInput {
    if (actor.role === 'ADMIN') return {};
    return actor.companyId ? { companyId: actor.companyId } : {};
  }

  private async resolveCompany(
    dtoCompanyId: string | undefined,
    actor: UserContext,
  ): Promise<string> {
    const companyId = actor.companyId ?? dtoCompanyId;
    if (!companyId) {
      throw new UnprocessableEntityException({
        key: 'business.company_required',
        error: 'UnprocessableEntity',
      });
    }
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company || company.status !== Status.ACTIVE) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    return companyId;
  }

  private async assertSolverGroup(groupId: string, _companyId: string) {
    const group = await this.prisma.solverGroup.findUnique({
      where: { id: groupId },
    });
    if (!group || group.status !== Status.ACTIVE) {
      throw new UnprocessableEntityException({
        key: 'business.group_invalid',
        error: 'UnprocessableEntity',
      });
    }
  }

  private async getDetail(id: string): Promise<ChangeRow> {
    const change = await this.prisma.change.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!change) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    return change;
  }
}
