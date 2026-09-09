import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { PermissionService } from '../../modules/permissions/permission.service.js';
import { UserContext } from '../../modules/auth/interfaces/auth-user.interface.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserContext['role'][]
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) {
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

    if (!this.permissionService.hasRole(user, requiredRoles)) {
      throw new ForbiddenException({
        key: 'errors.forbidden',
        error: 'Forbidden',
      });
    }
    return true;
  }
}
