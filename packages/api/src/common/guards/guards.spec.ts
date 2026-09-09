import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { RolesGuard } from './roles.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { Roles, ROLES_KEY } from '../decorators/roles.decorator.js';
import { Public, IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PermissionService } from '../../modules/permissions/permission.service.js';

const reflect = (value: unknown) =>
  ({ getAllAndOverride: () => value }) as unknown as Reflector;

const ctx = (user?: Record<string, unknown>) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const permissionService = {
    hasRole: (u: never, r: never) => PermissionService.prototype.hasRole(u, r),
  } as never;

  it('allows when no roles are required', () => {
    const guard = new RolesGuard(reflect(undefined), permissionService);
    expect(guard.canActivate(ctx())).toBe(true);
  });

  it('rejects when request has no user', () => {
    const guard = new RolesGuard(reflect(['ADMIN']), permissionService);
    expect(() => guard.canActivate(ctx())).toThrow(ForbiddenException);
  });

  it('allows matching role', () => {
    const guard = new RolesGuard(
      reflect(['MANAGER', 'ADMIN']),
      permissionService,
    );
    expect(guard.canActivate(ctx({ role: 'ADMIN' }))).toBe(true);
  });

  it('rejects non-matching role', () => {
    const guard = new RolesGuard(reflect(['ADMIN']), permissionService);
    expect(() => guard.canActivate(ctx({ role: 'USER' }))).toThrow(
      ForbiddenException,
    );
  });
});

describe('JwtAuthGuard', () => {
  it('bypasses authentication for public routes', () => {
    const guard = new JwtAuthGuard(reflect(true));
    expect(guard.canActivate(ctx())).toBe(true);
  });

  it('handleRequest throws Unauthorized when user missing', () => {
    const guard = new JwtAuthGuard(reflect(false));
    expect(() => guard.handleRequest(null, null)).toThrow(
      UnauthorizedException,
    );
  });

  it('handleRequest throws on passport error', () => {
    const guard = new JwtAuthGuard(reflect(false));
    expect(() => guard.handleRequest(new Error('boom'), { id: 1 })).toThrow(
      UnauthorizedException,
    );
  });

  it('handleRequest returns the user on success', () => {
    const guard = new JwtAuthGuard(reflect(false));
    expect(guard.handleRequest(null, { id: 1 })).toEqual({ id: 1 });
  });
});

describe('decorators', () => {
  it('Roles stores metadata under ROLES_KEY', () => {
    const target = () => undefined;
    Roles('ADMIN', 'MANAGER' as never)(target);
    expect(Reflect.getMetadata(ROLES_KEY, target)).toEqual([
      'ADMIN',
      'MANAGER',
    ]);
  });

  it('Public stores metadata under IS_PUBLIC_KEY', () => {
    const target = () => undefined;
    Public()(target);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, target)).toBe(true);
  });
});

describe('PermissionService', () => {
  it('hasRole matches by exact role', () => {
    const svc = new PermissionService({} as never);
    expect(svc.hasRole({ role: 'MANAGER' }, ['ADMIN', 'MANAGER'])).toBe(true);
    expect(svc.hasRole({ role: 'USER' }, ['ADMIN'])).toBe(false);
  });

  it('canViewInternalComments denies USER', () => {
    const svc = new PermissionService({} as never);
    expect(svc.canViewInternalComments({ role: 'USER' } as never)).toBe(false);
    expect(svc.canViewInternalComments({ role: 'AGENT' } as never)).toBe(true);
  });
});
