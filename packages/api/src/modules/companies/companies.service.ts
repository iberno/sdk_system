import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  isValidCnpj,
} from './dto/company.dto.js';
import {
  PaginationDto,
  paginationArgs,
  paginationMeta,
} from '../../common/dto/pagination.dto.js';
import { PaginatedResult } from '../../common/interceptors/transform.interceptor.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';

const companySelect = {
  id: true,
  name: true,
  cnpj: true,
  status: true,
  createdAt: true,
  _count: { select: { users: true, tickets: true } },
} satisfies Prisma.CompanySelect;

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async options(actor: UserContext) {
    if (actor.role === 'USER') {
      if (!actor.companyId) return [];
      const company = await this.prisma.company.findUnique({
        where: { id: actor.companyId },
        select: { id: true, name: true },
      });
      return company ? [company] : [];
    }
    return this.prisma.company.findMany({
      where: { status: Status.ACTIVE },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  private serialize(row: {
    id: string;
    name: string;
    cnpj: string | null;
    status: Status;
    createdAt: Date;
    _count: { users: number; tickets: number };
  }) {
    return {
      id: row.id,
      name: row.name,
      cnpj: row.cnpj,
      status: row.status,
      usersCount: row._count.users,
      ticketsCount: row._count.tickets,
      createdAt: row.createdAt,
    };
  }

  async findAll(query: PaginationDto): Promise<PaginatedResult<unknown>> {
    const { page = 1, pageSize = 20 } = query;
    const [rows, totalItems] = await Promise.all([
      this.prisma.company.findMany({
        ...paginationArgs(page, pageSize),
        orderBy: { createdAt: 'asc' },
        select: companySelect,
      }),
      this.prisma.company.count(),
    ]);
    return {
      items: rows.map((r) => this.serialize(r)),
      pagination: paginationMeta(page, pageSize, totalItems),
    };
  }

  async create(dto: CreateCompanyDto) {
    if (!isValidCnpj(dto.cnpj)) {
      throw new UnprocessableEntityException({
        key: 'business.invalid_cnpj',
        error: 'UnprocessableEntity',
      });
    }
    await this.assertUnique(dto.name, dto.cnpj);

    const row = await this.prisma.company.create({
      data: {
        name: dto.name,
        cnpj: dto.cnpj,
        status: dto.status ?? Status.ACTIVE,
      },
      select: companySelect,
    });
    return this.serialize(row);
  }

  async findOne(id: string) {
    const row = await this.prisma.company.findUnique({
      where: { id },
      select: companySelect,
    });
    if (!row) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    return this.serialize(row);
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    if (dto.cnpj && !isValidCnpj(dto.cnpj)) {
      throw new UnprocessableEntityException({
        key: 'business.invalid_cnpj',
        error: 'UnprocessableEntity',
      });
    }
    if (dto.name || dto.cnpj) {
      await this.assertUnique(dto.name, dto.cnpj, id);
    }
    const row = await this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.cnpj ? { cnpj: dto.cnpj } : {}),
      },
      select: companySelect,
    });
    return this.serialize(row);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    const row = await this.prisma.company.update({
      where: { id },
      data: { status: Status.INACTIVE },
      select: companySelect,
    });
    return this.serialize(row);
  }

  async updateStatus(id: string, status: Status) {
    await this.findOne(id);
    const row = await this.prisma.company.update({
      where: { id },
      data: { status },
      select: companySelect,
    });
    return this.serialize(row);
  }

  private async assertUnique(
    name: string | undefined,
    cnpj: string | undefined,
    ignoreId?: string,
  ) {
    const where: Prisma.CompanyWhereInput[] = [];
    if (name) where.push({ name });
    if (cnpj) where.push({ cnpj });
    if (where.length === 0) return;

    const duplicate = await this.prisma.company.findFirst({
      where: { OR: where, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true, name: true, cnpj: true },
    });
    if (duplicate) {
      throw new ConflictException({
        key: 'errors.conflict',
        error: 'Conflict',
      });
    }
  }
}
