import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Status, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { PaginatedResult } from '../../common/interceptors/transform.interceptor.js';
import { paginationArgs, paginationMeta } from '../../common/dto/pagination.dto.js';
import { UserContext } from '../auth/interfaces/auth-user.interface.js';

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['*'],
  MANAGER: [
    'user.view',
    'user.manage',
    'company.manage',
    'group.manage',
    'sla.manage',
    'routing.manage',
    'ticket.create',
    'ticket.update',
    'ticket.assign',
    'ticket.reassign',
    'ticket.close',
    'problem.manage',
    'change.manage',
    'approval.manage',
    'kb.manage',
    'report.view',
  ],
  AGENT: [
    'ticket.create',
    'ticket.update',
    'ticket.assign.self',
    'ticket.pickup',
    'ticket.comment',
    'kb.view',
  ],
  USER: ['ticket.create', 'ticket.view.self', 'ticket.comment.self'],
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: QueryUsersDto): Promise<PaginatedResult<unknown>> {
    const { page, pageSize, search, role, companyId, solverGroupId, status } = query;
    const where: Prisma.UserWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(role ? { role } : {}),
      ...(companyId ? { companyId } : {}),
      ...(solverGroupId ? { solverGroupId } : {}),
      ...(status ? { status } : {}),
    };

    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        ...paginationArgs(page, pageSize),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          locale: true,
          companyId: true,
          solverGroupId: true,
          createdAt: true,
          company: { select: { id: true, name: true } },
          solverGroup: { select: { id: true, name: true, level: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: users, pagination: paginationMeta(page, pageSize, totalItems) };
  }

  async findDirectory(query: QueryUsersDto, actor: UserContext) {
    const companyId =
      actor.role === 'USER' ? actor.companyId : (query.companyId ?? actor.companyId);
    const where: Prisma.UserWhereInput = {
      status: Status.ACTIVE,
      ...(companyId ? { companyId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.department
        ? { department: { contains: query.department, mode: 'insensitive' } }
        : {}),
    };

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        companyId: true,
      },
    });
    return users;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        locale: true,
        companyId: true,
        solverGroupId: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
        solverGroup: { select: { id: true, name: true, level: true } },
      },
    });
    if (!user) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return { ...user, permissions: ROLE_PERMISSIONS[user.role] };
  }

  async create(dto: CreateUserDto, actor: UserContext) {
    if (dto.role === UserRole.ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }
    await this.assertEmailAvailable(dto.email);

    const role = dto.role ?? UserRole.USER;
    if (dto.solverGroupId && role !== UserRole.AGENT) {
      throw new UnprocessableEntityException({
        key: 'business.agent_one_group',
        error: 'UnprocessableEntity',
      });
    }
    if (dto.solverGroupId) {
      await this.assertGroupUsable(dto.solverGroupId);
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: await hash(dto.password, 10),
        role,
        locale: dto.locale ?? 'pt-BR',
        status: Status.ACTIVE,
        companyId: dto.companyId ?? actor.companyId,
        solverGroupId: dto.solverGroupId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
        solverGroupId: true,
        createdAt: true,
      },
    });
    await this.audit.log({
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      userId: actor.sub,
      newData: { name: user.name, email: user.email, role: user.role, companyId: user.companyId },
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: UserContext) {
    const existing = await this.findEntity(id);

    if (
      (dto.role && dto.role !== existing.role) ||
      (dto.solverGroupId && dto.solverGroupId !== existing.solverGroupId)
    ) {
      if (actor.role !== UserRole.ADMIN) {
        throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
      }
    }

    if (dto.role === UserRole.ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }
    if (dto.email && dto.email !== existing.email) {
      await this.assertEmailAvailable(dto.email);
    }
    if (dto.solverGroupId) {
      await this.assertGroupUsable(dto.solverGroupId);
    }

    const data: Prisma.UserUpdateInput = {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.email ? { email: dto.email } : {}),
      ...(dto.password ? { password: await hash(dto.password, 10) } : {}),
      ...(dto.locale ? { locale: dto.locale } : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.solverGroupId !== undefined ? { solverGroupId: dto.solverGroupId } : {}),
    };

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
        solverGroupId: true,
        locale: true,
        createdAt: true,
      },
    });
    await this.audit.log({
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      userId: actor.sub,
      oldData: {
        ...(dto.name ? { name: existing.name } : {}),
        ...(dto.role && dto.role !== existing.role ? { role: existing.role } : {}),
        ...(dto.solverGroupId !== undefined && dto.solverGroupId !== existing.solverGroupId
          ? { solverGroupId: existing.solverGroupId }
          : {}),
      },
      newData: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.role && dto.role !== existing.role ? { role: dto.role } : {}),
        ...(dto.solverGroupId !== undefined && dto.solverGroupId !== existing.solverGroupId
          ? { solverGroupId: dto.solverGroupId }
          : {}),
      },
    });
    return user;
  }

  async updateStatus(id: string, status: Status, actor: UserContext) {
    const existing = await this.findEntity(id);
    if (actor.role === UserRole.USER) {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }
    if (existing.role === UserRole.ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException({ key: 'errors.forbidden', error: 'Forbidden' });
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    await this.audit.log({
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      userId: actor.sub,
      oldData: { status: existing.status },
      newData: { status: updated.status },
    });
    return updated;
  }

  private async findEntity(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return user;
  }

  private async assertEmailAvailable(email: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ key: 'errors.email_taken', error: 'Conflict' });
    }
  }

  private async assertGroupUsable(solverGroupId: string) {
    const group = await this.prisma.solverGroup.findUnique({ where: { id: solverGroupId } });
    if (!group || group.status !== Status.ACTIVE) {
      throw new UnprocessableEntityException({
        key: 'business.group_inactive',
        error: 'UnprocessableEntity',
      });
    }
  }
}