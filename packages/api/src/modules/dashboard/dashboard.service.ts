import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_OPEN = 'OPEN';
const STATUS_IN_PROGRESS = 'IN_PROGRESS';
const STATUS_RESOLVED = 'RESOLVED';
const STATUS_CLOSED = 'CLOSED';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(actor: UserContext) {
    if (actor.role === 'USER') {
      throw new ForbiddenException({
        key: 'errors.forbidden',
        error: 'Forbidden',
      });
    }
    const scope: Prisma.TicketWhereInput = this.visibilityScope(actor);

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const [
      openTickets,
      inProgress,
      resolved,
      slaBreached,
      byPriorityRaw,
      byStatusRaw,
      byTypeRaw,
      byGroupRaw,
      activity,
      avgResolution,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: { ...scope, status: STATUS_OPEN } }),
      this.prisma.ticket.count({
        where: { ...scope, status: STATUS_IN_PROGRESS },
      }),
      this.prisma.ticket.count({
        where: { ...scope, status: { in: [STATUS_RESOLVED, STATUS_CLOSED] } },
      }),
      this.prisma.ticket.count({ where: { ...scope, slaBreached: true } }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where: scope,
        _count: { _all: true },
        orderBy: { _count: { priority: 'desc' } },
      }),
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: scope,
        _count: { _all: true },
        orderBy: { _count: { status: 'desc' } },
      }),
      this.prisma.ticket.groupBy({
        by: ['type'],
        where: scope,
        _count: { _all: true },
        orderBy: { _count: { type: 'desc' } },
      }),
      this.prisma.ticket.groupBy({
        by: ['solverGroupId'],
        where: scope,
        _count: { _all: true },
        orderBy: { _count: { solverGroupId: 'desc' } },
      }),
      this.prisma.ticket.findMany({
        where: { ...scope, createdAt: { gte: start } },
        select: {
          id: true,
          createdAt: true,
          resolvedAt: true,
          closedAt: true,
          status: true,
        },
      }),
      this.prisma.ticket.findMany({
        where: { ...scope, status: { in: [STATUS_RESOLVED, STATUS_CLOSED] } },
        select: { id: true, createdAt: true, resolvedAt: true },
      }),
    ]);

    const byGroupIds = byGroupRaw
      .map((g) => g.solverGroupId)
      .filter((id): id is string => id !== null);
    const groups = byGroupIds.length
      ? await this.prisma.solverGroup.findMany({
          where: { id: { in: byGroupIds } },
          select: { id: true, name: true },
        })
      : [];
    const groupName = new Map(groups.map((g) => [g.id, g.name]));
    const byGroup = byGroupRaw.map((g) => ({
      group: g.solverGroupId
        ? (groupName.get(g.solverGroupId) ?? 'Desconhecido')
        : 'Sem grupo',
      count: g._count._all,
    }));

    const byPriority: Record<string, number> = {};
    for (const p of byPriorityRaw) byPriority[p.priority] = p._count._all;
    const byStatus: Record<string, number> = {};
    for (const s of byStatusRaw) byStatus[s.status] = s._count._all;
    const byType: Record<string, number> = {};
    for (const t of byTypeRaw) byType[t.type] = t._count._all;

    const firstResponses = await this.firstResponseByTicket(scope);

    const durations = activity
      .map((t) => firstResponses.get(t.id))
      .filter((d): d is number => typeof d === 'number');
    const avgFirstResponseMin =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    const resolutionDurations = avgResolution
      .filter((t) => t.resolvedAt)
      .map(
        (t) =>
          Math.max(0, t.resolvedAt!.getTime() - t.createdAt.getTime()) /
          3_600_000,
      );
    const avgResolutionHours =
      resolutionDurations.length > 0
        ? Math.round(
            (resolutionDurations.reduce((a, b) => a + b, 0) /
              resolutionDurations.length) *
              10,
          ) / 10
        : 0;

    const trend = this.buildTrend(activity, start, end);

    return {
      period: {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      },
      totals: {
        openTickets,
        inProgress,
        resolved,
        slaBreached,
        avgFirstResponseMin,
        avgResolutionHours,
      },
      byPriority,
      byStatus,
      byType,
      byGroup,
      trend,
    };
  }

  private async firstResponseByTicket(
    scope: Prisma.TicketWhereInput,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.ticketComment.groupBy({
      by: ['ticketId'],
      where: {
        ticket: scope,
        author: { role: { not: 'USER' } },
      },
      _min: { createdAt: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row._min?.createdAt) {
        map.set(row.ticketId, row._min.createdAt.getTime());
      }
    }
    if (map.size === 0) return map;

    const tickets = await this.prisma.ticket.findMany({
      where: { id: { in: [...map.keys()] } },
      select: { id: true, createdAt: true },
    });
    const createdBy = new Map(
      tickets.map((t) => [t.id, t.createdAt.getTime()]),
    );
    const result = new Map<string, number>();
    for (const [ticketId, firstTs] of map) {
      const createdAt = createdBy.get(ticketId);
      if (createdAt === undefined) continue;
      const durationMs = Math.max(0, firstTs - createdAt);
      result.set(ticketId, Math.round(durationMs / 60_000));
    }
    return result;
  }

  private buildTrend(
    activity: Array<{
      status: string;
      createdAt: Date;
      resolvedAt: Date | null;
      closedAt: Date | null;
    }>,
    start: Date,
    end: Date,
  ) {
    const day = (date: Date) => date.toISOString().slice(0, 10);
    const buckets = new Map<string, { created: number; resolved: number }>();
    for (
      let d = new Date(start);
      d.getTime() <= end.getTime();
      d = new Date(d.getTime() + DAY_MS)
    ) {
      buckets.set(day(d), { created: 0, resolved: 0 });
    }
    for (const t of activity) {
      const c = buckets.get(day(t.createdAt));
      if (c) c.created += 1;
      const done = t.resolvedAt ?? t.closedAt;
      if (done) {
        const r = buckets.get(day(done));
        if (r) r.resolved += 1;
      }
    }
    return [...buckets.entries()].map(([date, counts]) => ({
      date,
      created: counts.created,
      resolved: counts.resolved,
    }));
  }

  private visibilityScope(actor: UserContext): Prisma.TicketWhereInput {
    if (actor.role === 'ADMIN') return {};
    return actor.companyId ? { companyId: actor.companyId } : {};
  }
}
