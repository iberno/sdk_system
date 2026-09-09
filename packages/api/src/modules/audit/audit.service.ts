import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginationArgs, paginationMeta } from '../../common/dto/pagination.dto.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import { QueryAuditDto } from './dto/query-audit.dto.js';
import { auditStorage } from './audit.context.js';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    const ctx = auditStorage.getStore();
    const json = (raw?: Record<string, unknown>): Prisma.InputJsonValue | undefined =>
      raw && Object.keys(raw).length > 0 ? (raw as Prisma.InputJsonValue) : undefined;

    await this.prisma.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        oldData: json(entry.oldData),
        newData: json(entry.newData),
        userId: entry.userId ?? null,
        ip: entry.ip ?? ctx?.ip ?? null,
        userAgent: entry.userAgent ?? ctx?.userAgent ?? null,
      },
    });
  }

  async list(actor: UserContext, query: QueryAuditDto) {
    if (actor.role !== 'ADMIN' && actor.role !== 'MANAGER') {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }

    const where: Prisma.AuditLogWhereInput = {};
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.action) where.action = { equals: query.action, mode: 'insensitive' };
    if (query.userId) where.userId = query.userId;
    if (query.startDate || query.endDate) {
      where.createdAt = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.auditLog.findMany({
        ...paginationArgs(query.page ?? 1, query.pageSize ?? 20),
        where,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        oldData: row.oldData,
        newData: row.newData,
        userId: row.userId,
        user: row.user,
        ip: row.ip,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      })),
      pagination: paginationMeta(query.page ?? 1, query.pageSize ?? 20, totalItems),
    };
  }
}