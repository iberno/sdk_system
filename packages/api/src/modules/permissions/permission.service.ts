import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserContext } from '../auth/interfaces/auth-user.interface.js';

interface ApprovalRule {
  step: number;
  approverRole: string;
  type: 'OR' | 'AND';
}

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  hasRole(user: Pick<UserContext, 'role'>, allowedRoles: string[]): boolean {
    return allowedRoles.includes(user.role);
  }

  async isGroupMember(userId: string, groupId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, solverGroupId: groupId },
      select: { id: true },
    });
    return user !== null;
  }

  async getGroup(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        solverGroup: { select: { id: true, name: true, level: true, status: true } },
      },
    });
  }

  async canActAsApprover(user: UserContext, entityType: 'TICKET' | 'CHANGE'): Promise<boolean> {
    const flow = await this.prisma.approvalFlow.findFirst({
      where: { entityType, status: 'ACTIVE' },
    });
    if (!flow) {
      return false;
    }
    const rules = flow.rules as unknown as ApprovalRule[];
    return rules.some((rule) => rule.approverRole === user.role);
  }

  canViewInternalComments(user: UserContext): boolean {
    return user.role !== 'USER';
  }
}