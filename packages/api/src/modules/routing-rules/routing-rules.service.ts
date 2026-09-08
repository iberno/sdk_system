import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Priority, RoutingStrategy, Status, TicketType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateRoutingRuleDto,
  ReorderRulesDto,
  UpdateRoutingRuleDto,
} from './dto/routing-rule.dto.js';
import { OPEN_TICKET_STATUSES } from '../solver-groups/dto/solver-group.dto.js';

type StrategyTarget = {
  groupId: string | null;
  assigneeId?: string;
  strategy: RoutingStrategy;
  routingRuleId: string | null;
};

@Injectable()
export class RoutingRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.routingRule.findMany({
      where: { status: { not: Status.INACTIVE } },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { targetGroup: { select: { id: true, name: true, level: true } } },
    });
  }

  async create(dto: CreateRoutingRuleDto) {
    await this.assertStrategy(dto.strategy, dto.targetGroupId);

    const count = await this.prisma.routingRule.count();
    const row = await this.prisma.routingRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        ticketType: dto.ticketType,
        priority: dto.priority,
        category: dto.category,
        strategy: dto.strategy,
        targetGroupId: dto.targetGroupId ?? null,
        order: dto.order ?? count,
        status: dto.status ?? Status.ACTIVE,
      },
      include: { targetGroup: { select: { id: true, name: true, level: true } } },
    });
    return row;
  }

  async update(id: string, dto: UpdateRoutingRuleDto) {
    const current = await this.findEntity(id);
    if (dto.strategy || dto.targetGroupId !== undefined) {
      await this.assertStrategy(
        dto.strategy ?? current.strategy,
        dto.targetGroupId !== undefined ? dto.targetGroupId : current.targetGroupId ?? undefined,
      );
    }
    const row = await this.prisma.routingRule.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.ticketType ? { ticketType: dto.ticketType } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.strategy ? { strategy: dto.strategy } : {}),
        ...(dto.targetGroupId !== undefined ? { targetGroupId: dto.targetGroupId } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
      },
      include: { targetGroup: { select: { id: true, name: true, level: true } } },
    });
    return row;
  }

  async reorder(dto: ReorderRulesDto) {
    const ids = dto.rules.map((r) => r.id);
    const existing = await this.prisma.routingRule.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (existing.length !== new Set(ids).size) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    await this.prisma.$transaction(
      dto.rules.map((r) =>
        this.prisma.routingRule.update({ where: { id: r.id }, data: { order: r.order } }),
      ),
    );
    return this.findAll();
  }

  async updateStatus(id: string, status: Status) {
    const rule = await this.findEntity(id);
    if (status === Status.ACTIVE && rule.targetGroupId && rule.strategy !== RoutingStrategy.MANUAL) {
      const group = await this.prisma.solverGroup.findUnique({
        where: { id: rule.targetGroupId },
      });
      if (!group || group.status !== Status.ACTIVE) {
        throw new UnprocessableEntityException({
          key: 'business.group_inactive',
          error: 'UnprocessableEntity',
        });
      }
    }
    return this.prisma.routingRule.update({
      where: { id },
      data: { status },
      include: { targetGroup: { select: { id: true, name: true, level: true } } },
    });
  }

  async evaluate(
    type: TicketType,
    priority: Priority,
    category?: string,
  ): Promise<RoutingRuleWithTarget | null> {
    const rules = await this.prisma.routingRule.findMany({
      where: { status: Status.ACTIVE },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { targetGroup: true },
    });
    return (
      rules.find(
        (r) =>
          r.ticketType === type &&
          (r.priority === null || r.priority === priority) &&
          (r.category === null ||
            r.category === '' ||
            (category !== undefined && r.category === category)),
      ) ?? null
    );
  }

  async defaultGroup() {
    return this.prisma.solverGroup.findFirst({
      where: { status: Status.ACTIVE },
      orderBy: [{ createdAt: 'asc' }, { level: 'asc' }],
    });
  }

  async resolveDestination(
    type: TicketType,
    priority: Priority,
    category?: string,
  ): Promise<StrategyTarget | null> {
    const rule = await this.evaluate(type, priority, category);
    if (!rule) {
      const fallback = await this.defaultGroup();
      if (!fallback) return null;
      return {
        groupId: fallback.id,
        strategy: RoutingStrategy.MANUAL,
        routingRuleId: null,
      };
    }

    const target = rule.targetGroup;
    if (!target || target.status !== Status.ACTIVE) {
      return null;
    }

    const base: StrategyTarget = {
      groupId: target.id,
      strategy: rule.strategy,
      routingRuleId: rule.id,
    };

    if (rule.strategy === RoutingStrategy.ROUND_ROBIN) {
      const assigneeId = await this.pickRoundRobin(target.id);
      return assigneeId ? { ...base, assigneeId } : base;
    }
    if (rule.strategy === RoutingStrategy.LEAST_LOADED) {
      const assigneeId = await this.pickLeastLoaded(target.id);
      return assigneeId ? { ...base, assigneeId } : base;
    }
    return base;
  }

  async pickRoundRobin(groupId: string): Promise<string | null> {
    const agents = await this.prisma.user.findMany({
      where: { solverGroupId: groupId, role: 'AGENT', status: Status.ACTIVE },
      orderBy: { name: 'asc' },
      select: { id: true },
    });
    if (agents.length === 0) return null;

    const lastTicket = await this.prisma.ticket.findFirst({
      where: { solverGroupId: groupId, assigneeId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { assigneeId: true },
    });
    if (!lastTicket?.assigneeId) return agents[0].id;

    const lastIndex = agents.findIndex((a) => a.id === lastTicket.assigneeId);
    return agents[(lastIndex + 1) % agents.length].id;
  }

  async pickLeastLoaded(groupId: string): Promise<string | null> {
    const agents = await this.prisma.user.findMany({
      where: { solverGroupId: groupId, role: 'AGENT', status: Status.ACTIVE },
      select: { id: true },
    });
    if (agents.length === 0) return null;

    const loads = await Promise.all(
      agents.map((a) =>
        this.prisma.ticket.count({
          where: { assigneeId: a.id, status: { in: OPEN_TICKET_STATUSES } },
        }),
      ),
    );
    const minLoad = Math.min(...loads);
    return agents[loads.indexOf(minLoad)].id;
  }

  private async assertStrategy(
    strategy: RoutingStrategy,
    targetGroupId: string | undefined,
  ) {
    if (!targetGroupId && strategy !== RoutingStrategy.MANUAL) {
      throw new UnprocessableEntityException({
        key: 'business.routing_target_required',
        error: 'UnprocessableEntity',
        args: { strategy },
      });
    }
    if (targetGroupId && strategy !== RoutingStrategy.MANUAL) {
      const group = await this.prisma.solverGroup.findUnique({
        where: { id: targetGroupId },
      });
      if (!group || group.status !== Status.ACTIVE) {
        throw new UnprocessableEntityException({
          key: 'business.group_inactive',
          error: 'UnprocessableEntity',
        });
      }
    }
  }

  private async findEntity(id: string) {
    const rule = await this.prisma.routingRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return rule;
  }
}

type RoutingRuleWithTarget = {
  id: string;
  targetGroup: { id: string; status: Status } | null;
  strategy: RoutingStrategy;
} | null;