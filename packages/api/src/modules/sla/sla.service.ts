import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Priority, SLAType, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateSlapolicyDto,
  SlaComputed,
  UpdateSlapolicyDto,
} from './dto/sla-policy.dto.js';

const DEFAULT_RESPONSE = 480;
const DEFAULT_RESOLVE = 2880;

@Injectable()
export class SlaService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sLAPolicy.findMany({
      orderBy: [{ type: 'asc' }, { priority: 'asc' }],
    });
  }

  async create(dto: CreateSlapolicyDto) {
    await this.assertUniquePair(dto.type, dto.priority);
    return this.prisma.sLAPolicy.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        priority: dto.priority,
        responseTime: dto.responseTime,
        resolveTime: dto.resolveTime,
        status: dto.status ?? Status.ACTIVE,
      },
    });
  }

  async findOne(id: string) {
    const policy = await this.prisma.sLAPolicy.findUnique({ where: { id } });
    if (!policy) {
      throw new NotFoundException({
        key: 'errors.not_found',
        error: 'NotFound',
      });
    }
    return policy;
  }

  async update(id: string, dto: UpdateSlapolicyDto) {
    await this.findOne(id);
    return this.prisma.sLAPolicy.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.responseTime ? { responseTime: dto.responseTime } : {}),
        ...(dto.resolveTime ? { resolveTime: dto.resolveTime } : {}),
      },
    });
  }

  async updateStatus(id: string, status: Status) {
    await this.findOne(id);
    return this.prisma.sLAPolicy.update({ where: { id }, data: { status } });
  }

  async calculate(type: SLAType, priority: Priority): Promise<SlaComputed> {
    const policy = await this.prisma.sLAPolicy.findFirst({
      where: { type, priority, status: Status.ACTIVE },
    });

    const responseMinutes = policy?.responseTime ?? DEFAULT_RESPONSE;
    const resolveMinutes = policy?.resolveTime ?? DEFAULT_RESOLVE;
    const now = Date.now();

    return {
      responseMinutes,
      resolveMinutes,
      slaResponseAt: new Date(now + responseMinutes * 60_000),
      slaResolveAt: new Date(now + resolveMinutes * 60_000),
    };
  }

  private async assertUniquePair(type: SLAType, priority: Priority) {
    const existing = await this.prisma.sLAPolicy.findFirst({
      where: { type, priority },
    });
    if (existing) {
      throw new ConflictException({
        key: 'errors.conflict',
        error: 'Conflict',
      });
    }
  }
}
