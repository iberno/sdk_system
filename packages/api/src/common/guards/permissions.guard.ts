import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { PrismaService } from '../../modules/prisma/prisma.service.js';
import { UserContext } from '../../modules/auth/interfaces/auth-user.interface.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: UserContext }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException({
        key: 'errors.forbidden',
        error: 'Forbidden',
      });
    }

    const userPermissions = await this.getUserPermissions(user.role);

    const hasAll = requiredPermissions.every((required) => {
      if (userPermissions.includes('*')) return true;

      if (required.includes('.self')) {
        const basePerm = required.replace('.self', '');
        return (
          userPermissions.includes(required) ||
          userPermissions.includes(basePerm)
        );
      }

      return userPermissions.includes(required);
    });

    if (!hasAll) {
      throw new ForbiddenException({
        key: 'errors.forbidden',
        error: 'Forbidden',
      });
    }

    return true;
  }

  private async getUserPermissions(role: string): Promise<string[]> {
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleId: role },
      include: { permission: { select: { code: true } } },
    });
    return rolePerms.map(
      (rp: { permission: { code: string } }) => rp.permission.code,
    );
  }
}
