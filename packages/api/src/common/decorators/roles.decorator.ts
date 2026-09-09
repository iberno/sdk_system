import { SetMetadata } from '@nestjs/common';
import { UserRoleType } from '../../modules/auth/interfaces/auth-user.interface.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoleType[]) =>
  SetMetadata(ROLES_KEY, roles);
