import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProblemStatus, Prisma, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { paginationArgs, paginationMeta } from '../../common/dto/pagination.dto.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import {
  CreateProblemDto,
  LinkTicketDto,
  QueryProblemsDto,
  UpdateProblemDto,
} from './dto/problem.dto.js';

const PROBLEM_INCLUDE = {
  company: { select: { id: true, name: true } },
  proposedChange: { select: { id: true, title: true, status: true, type: true } },
} satisfies Prisma.ProblemInclude;

const DETAIL_INCLUDE = {
  ...PROBLEM_INCLUDE,
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
} satisfies Prisma.ProblemInclude;

const TRANSITIONS: Record<ProblemStatus, ProblemStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED', 'OPEN'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS', 'OPEN'],
  CLOSED: ['OPEN'],
};

type ProblemRow = Prisma.ProblemGetPayload<{ include: typeof DETAIL_INCLUDE }>;

@Injectable()
export class ProblemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: QueryProblemsDto, actor: UserContext) {
    this.assertTeam(actor);
    const where: Prisma.ProblemWhereInput = this.visibilityScope(actor);
    if (query.status) where.status = query.status;
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.problem.findMany({
        ...paginationArgs(1, 50),
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          ...PROBLEM_INCLUDE,
          _count: { select: { tickets: true } },
        },
      }),
      this.prisma.problem.count({ where }),
    ]);

    return {
      items: rows.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        impact: p.impact,
        rootCause: p.rootCause,
        workaround: p.workaround,
        solution: p.solution,
        company: p.company,
        proposedChange: p.proposedChange,
        linkedTickets: p._count.tickets,
        createdAt: p.createdAt,
        resolvedAt: p.resolvedAt,
      })),
      pagination: paginationMeta(1, 50, totalItems),
    };
  }

  async findOne(id: string, actor: UserContext) {
    const problem = await this.getDetail(id);
    if (!this.isVisible(problem, actor)) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return this.mapDetail(problem);
  }

  async create(dto: CreateProblemDto, actor: UserContext) {
    this.assertTeam(actor);
    const companyId = await this.resolveCompany(dto.companyId, actor);
    const problem = await this.prisma.problem.create({
      data: {
        title: dto.title,
        description: dto.description,
        impact: dto.impact ?? 'MEDIUM',
        companyId,
      },
      include: DETAIL_INCLUDE,
    });
    await this.audit.log({
      action: 'CREATE',
      entity: 'Problem',
      entityId: problem.id,
      userId: actor.sub,
      newData: {
        title: problem.title,
        impact: problem.impact,
        status: problem.status,
        companyId: problem.companyId,
      },
    });
    return this.mapDetail(problem);
  }

  async update(id: string, dto: UpdateProblemDto, actor: UserContext) {
    this.assertTeam(actor);
    const prev = await this.getDetail(id);
    if (!this.isVisible(prev, actor)) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }

    if (dto.status && dto.status !== prev.status) {
      if (!(TRANSITIONS[prev.status] ?? []).includes(dto.status)) {
        throw new UnprocessableEntityException({
          key: 'business.invalid_transition',
          error: 'UnprocessableEntity',
          args: { from: prev.status, to: dto.status },
        });
      }
    }

    const updated = await this.prisma.problem.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.impact ? { impact: dto.impact } : {}),
        ...(dto.rootCause !== undefined ? { rootCause: dto.rootCause } : {}),
        ...(dto.workaround !== undefined ? { workaround: dto.workaround } : {}),
        ...(dto.solution !== undefined ? { solution: dto.solution } : {}),
        ...(dto.status
          ? {
              status: dto.status,
              ...(dto.status === 'RESOLVED' && !prev.resolvedAt
                ? { resolvedAt: new Date() }
                : {}),
            }
          : {}),
      },
      include: DETAIL_INCLUDE,
    });
    await this.audit.log({
      action: 'UPDATE',
      entity: 'Problem',
      entityId: id,
      userId: actor.sub,
      oldData: {
        title: prev.title,
        status: prev.status,
        ...(dto.rootCause !== undefined ? { rootCause: prev.rootCause ?? null } : {}),
        ...(dto.solution !== undefined ? { solution: prev.solution ?? null } : {}),
      },
      newData: {
        title: updated.title,
        status: updated.status,
        ...(dto.rootCause !== undefined ? { rootCause: updated.rootCause ?? null } : {}),
        ...(dto.solution !== undefined ? { solution: updated.solution ?? null } : {}),
      },
    });
    return this.mapDetail(updated);
  }

  async linkTicket(id: string, dto: LinkTicketDto, actor: UserContext) {
    this.assertTeam(actor);
    const problem = await this.getDetail(id);
    if (!this.isVisible(problem, actor)) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    const ticket = await this.prisma.ticket.findUnique({ where: { id: dto.ticketId } });
    if (!ticket || ticket.companyId !== problem.companyId) {
      throw new UnprocessableEntityException({
        key: 'business.ticket_link_invalid',
        error: 'UnprocessableEntity',
      });
    }
    const existing = await this.prisma.problemTicket.findFirst({
      where: { problemId: id, ticketId: ticket.id },
    });
    if (!existing) {
      await this.prisma.problemTicket.create({
        data: { problemId: id, ticketId: ticket.id },
      });
    }
    await this.audit.log({
      action: 'LINK',
      entity: 'Problem',
      entityId: id,
      userId: actor.sub,
      newData: { ticketId: ticket.id },
    });
    return this.findOne(id, actor);
  }

  async unlinkTicket(id: string, ticketId: string, actor: UserContext) {
    this.assertTeam(actor);
    const problem = await this.getDetail(id);
    if (!this.isVisible(problem, actor)) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    await this.prisma.problemTicket.deleteMany({
      where: { problemId: id, ticketId },
    });
    await this.audit.log({
      action: 'UNLINK',
      entity: 'Problem',
      entityId: id,
      userId: actor.sub,
      newData: { ticketId },
    });
    return this.findOne(id, actor);
  }

  private mapDetail(problem: ProblemRow) {
    const tickets = (problem.tickets ?? []).map((t) => ({
      id: t.ticket.id,
      ticketNumber: t.ticket.ticketNumber,
      title: t.ticket.title,
      type: t.ticket.type,
      status: t.ticket.status,
      priority: t.ticket.priority,
    }));
    const titles: Record<string, number> = {};
    for (const t of tickets) {
      const key = t.title.trim().toLowerCase();
      titles[key] = (titles[key] ?? 0) + 1;
    }
    const recurrence = Object.entries(titles)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);

    return {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      status: problem.status,
      impact: problem.impact,
      rootCause: problem.rootCause,
      workaround: problem.workaround,
      solution: problem.solution,
      company: problem.company,
      proposedChange: problem.proposedChange,
      linkedTickets: tickets,
      recurrence,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
      resolvedAt: problem.resolvedAt,
    };
  }

  private assertTeam(actor: UserContext) {
    if (actor.role === 'USER') {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }
  }

  private isVisible(problem: { companyId: string }, actor: UserContext): boolean {
    if (actor.role === 'ADMIN') return true;
    return actor.companyId != null && problem.companyId === actor.companyId;
  }

  private visibilityScope(actor: UserContext): Prisma.ProblemWhereInput {
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
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company || company.status !== Status.ACTIVE) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return companyId;
  }

  private async getDetail(id: string): Promise<ProblemRow> {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!problem) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return problem;
  }
}