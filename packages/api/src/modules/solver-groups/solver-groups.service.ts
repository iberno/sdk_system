import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Status, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateSolverGroupDto,
  OPEN_TICKET_STATUSES,
  ReplaceAgentsDto,
  UpdateSolverGroupDto,
} from './dto/solver-group.dto.js';

const groupSelect = {
  id: true,
  name: true,
  description: true,
  level: true,
  status: true,
  createdAt: true,
  _count: { select: { users: true } },
} satisfies Prisma.SolverGroupSelect;

type GroupRow = Prisma.SolverGroupGetPayload<{ select: typeof groupSelect }>;

@Injectable()
export class SolverGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private async serializeGroup(row: GroupRow) {
    const [agentsCount, openTickets] = await Promise.all([
      this.prisma.user.count({
        where: {
          solverGroupId: row.id,
          role: UserRole.AGENT,
          status: Status.ACTIVE,
        },
      }),
      this.prisma.ticket.count({
        where: { solverGroupId: row.id, status: { in: OPEN_TICKET_STATUSES } },
      }),
    ]);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      level: row.level,
      status: row.status,
      agentsCount,
      openTickets,
    };
  }

  async findAll() {
    const rows = await this.prisma.solverGroup.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      select: groupSelect,
    });
    return Promise.all(rows.map((r) => this.serializeGroup(r)));
  }

  async findOne(id: string) {
    const row = await this.prisma.solverGroup.findUnique({
      where: { id },
      select: {
        ...groupSelect,
        users: {
          where: { role: UserRole.AGENT },
          select: { id: true, name: true, email: true, status: true },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    const { users, ...rest } = row;
    const base = await this.serializeGroup(rest);
    return { ...base, agents: users };
  }

  async create(dto: CreateSolverGroupDto) {
    const agents = await this.assertAgentsUsable(dto.agentIds);
    const row = await this.prisma.solverGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        level: dto.level,
        status: dto.status ?? Status.ACTIVE,
        users: { connect: agents.map((a) => ({ id: a.id })) },
      },
      select: groupSelect,
    });
    return this.serializeGroup(row);
  }

  async update(id: string, dto: UpdateSolverGroupDto) {
    await this.findEntity(id);
    const row = await this.prisma.solverGroup.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.level ? { level: dto.level } : {}),
      },
      select: groupSelect,
    });
    return this.serializeGroup(row);
  }

  async replaceAgents(id: string, dto: ReplaceAgentsDto) {
    await this.findEntity(id);
    const agents = await this.assertAgentsUsable(dto.agentIds);

    const currentIds = (
      await this.prisma.user.findMany({
        where: { solverGroupId: id },
        select: { id: true },
      })
    ).map((u) => u.id);

    const removed = currentIds.filter((cid) => !dto.agentIds.includes(cid));

    await this.prisma.$transaction([
      ...removed.map((uid) =>
        this.prisma.user.update({
          where: { id: uid },
          data: { solverGroupId: null },
        }),
      ),
      ...agents.map((a) =>
        this.prisma.user.update({
          where: { id: a.id },
          data: { solverGroupId: id },
        }),
      ),
    ]);

    return this.findOne(id);
  }

  async updateStatus(id: string, status: Status) {
    await this.findEntity(id);
    if (status === Status.ACTIVE) {
      const count = await this.prisma.user.count({
        where: {
          solverGroupId: id,
          role: UserRole.AGENT,
          status: Status.ACTIVE,
        },
      });
      if (count === 0) {
        throw new UnprocessableEntityException({
          key: 'business.group_min_one_agent',
          error: 'UnprocessableEntity',
        });
      }
    }
    const row = await this.prisma.solverGroup.update({
      where: { id },
      data: { status },
      select: groupSelect,
    });
    return this.serializeGroup(row);
  }

  private async findEntity(id: string) {
    const group = await this.prisma.solverGroup.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    return group;
  }

  private async assertAgentsUsable(agentIds: string[]) {
    if (new Set(agentIds).size !== agentIds.length) {
      throw new UnprocessableEntityException({
        key: 'errors.conflict',
        error: 'UnprocessableEntity',
      });
    }
    const agents = await this.prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, role: true, status: true },
    });
    if (agents.length !== agentIds.length) {
      throw new UnprocessableEntityException({
        key: 'errors.not_found',
        error: 'UnprocessableEntity',
      });
    }
    for (const agent of agents) {
      if (agent.role !== UserRole.AGENT) {
        throw new UnprocessableEntityException({
          key: 'business.agent_role_required',
          error: 'UnprocessableEntity',
        });
      }
      if (agent.status !== Status.ACTIVE) {
        throw new UnprocessableEntityException({
          key: 'business.agent_inactive',
          error: 'UnprocessableEntity',
        });
      }
    }
    return agents;
  }
}
