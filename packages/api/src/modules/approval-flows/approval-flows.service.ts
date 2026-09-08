import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserContext } from '../auth/interfaces/auth-user.interface.js';
import {
  CreateApprovalFlowDto,
  QueryApprovalFlowsDto,
  UpdateApprovalFlowDto,
} from './dto/approval-flow.dto.js';

export type ApprovalStage = {
  order: number;
  approverRole?: string;
  approverCategory?: string;
  solverGroupId?: string;
  userId?: string;
};

const FLOW_INCLUDE = {
  company: { select: { id: true, name: true } },
} satisfies Prisma.ApprovalFlowInclude;

export function normalizeStages(rules: unknown): ApprovalStage[] {
  if (!rules || typeof rules !== 'object') return [];
  const raw = Array.isArray(rules)
    ? (rules as Record<string, unknown>[])
    : Array.isArray((rules as Record<string, unknown>).stages)
      ? ((rules as Record<string, unknown>).stages as Record<string, unknown>[])
      : [];
  return raw.map((s, i) => ({
    order: typeof s.order === 'number' ? (s.order as number)
      : typeof s.step === 'number' ? (s.step as number)
      : i + 1,
    approverRole: typeof s.approverRole === 'string' ? s.approverRole : undefined,
    approverCategory:
      typeof s.approverCategory === 'string' ? s.approverCategory : undefined,
    solverGroupId: typeof s.solverGroupId === 'string' ? s.solverGroupId : undefined,
    userId: typeof s.userId === 'string' ? s.userId : undefined,
  }));
}

export function validateStages(rules: unknown): ApprovalStage[] {
  const stages = normalizeStages(rules);
  if (stages.length === 0) {
    throw new UnprocessableEntityException({
      key: 'business.approval_stages_required',
      error: 'UnprocessableEntity',
    });
  }
  for (const stage of stages) {
    if (!stage.userId && !stage.solverGroupId && !stage.approverRole) {
      throw new UnprocessableEntityException({
        key: 'business.approval_stage_invalid',
        error: 'UnprocessableEntity',
        args: { order: stage.order },
      });
    }
  }
  return stages.sort((a, b) => a.order - b.order);
}

@Injectable()
export class ApprovalFlowsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryApprovalFlowsDto, actor: UserContext) {
    const where: Prisma.ApprovalFlowWhereInput = {};
    if (query.entityType) where.entityType = query.entityType;
    if (query.status) where.status = query.status;
    if (actor.role === 'MANAGER' && actor.companyId) {
      where.companyId = actor.companyId;
    } else if (actor.role === 'ADMIN' && query.companyId) {
      where.companyId = query.companyId;
    }
    return this.prisma.approvalFlow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: FLOW_INCLUDE,
    });
  }

  async findOne(id: string) {
    return this.findEntity(id);
  }

  async create(dto: CreateApprovalFlowDto, actor: UserContext) {
    validateStages(dto.rules);
    const companyId = await this.resolveCompany(dto, actor);
    return this.prisma.approvalFlow.create({
      data: {
        name: dto.name,
        description: dto.description,
        entityType: dto.entityType,
        rules: dto.rules as Prisma.InputJsonValue,
        status: dto.status ?? Status.ACTIVE,
        companyId,
      },
      include: FLOW_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateApprovalFlowDto) {
    await this.findEntity(id);
    if (dto.rules !== undefined) validateStages(dto.rules);
    return this.prisma.approvalFlow.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.entityType ? { entityType: dto.entityType } : {}),
        ...(dto.rules !== undefined ? { rules: dto.rules as Prisma.InputJsonValue } : {}),
      },
      include: FLOW_INCLUDE,
    });
  }

  async updateStatus(id: string, status: Status) {
    await this.findEntity(id);
    return this.prisma.approvalFlow.update({
      where: { id },
      data: { status },
      include: FLOW_INCLUDE,
    });
  }

  private async resolveCompany(
    dto: CreateApprovalFlowDto,
    actor: UserContext,
  ): Promise<string> {
    const companyId = actor.companyId;
    if (!companyId && !dto.companyId) {
      throw new UnprocessableEntityException({
        key: 'business.approval_flow_company_required',
        error: 'UnprocessableEntity',
      });
    }
    const finalCompanyId = companyId ?? dto.companyId!;
    const company = await this.prisma.company.findUnique({
      where: { id: finalCompanyId },
    });
    if (!company) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return finalCompanyId;
  }

  private async findEntity(id: string) {
    const flow = await this.prisma.approvalFlow.findUnique({
      where: { id },
      include: FLOW_INCLUDE,
    });
    if (!flow) {
      throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
    }
    return flow;
  }
}