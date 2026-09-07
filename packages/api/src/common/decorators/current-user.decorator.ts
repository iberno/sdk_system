import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContext } from '../../modules/auth/interfaces/auth-user.interface.js';

export const CurrentUser = createParamDecorator(
  (data: keyof UserContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: UserContext }>();
    const user = request.user as UserContext | undefined;
    return data && user ? user[data] : user;
  },
);