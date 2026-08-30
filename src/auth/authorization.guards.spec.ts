import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AccessTokenPayload } from './auth.types';
import { RolesGuard } from './roles.guard';
import { TenantGuard } from '../tenancy/tenant.guard';

function contextWithUser(user?: AccessTokenPayload): ExecutionContext {
  return {
    getHandler: () => contextWithUser,
    getClass: () => TenantGuard,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('authorization guards', () => {
  const admin: AccessTokenPayload = {
    sub: 'user-a',
    tenantId: 'tenant-a',
    roles: [UserRole.ADMIN],
  };

  it('TenantGuard requires tenant identity from the authenticated JWT', () => {
    const guard = new TenantGuard();

    expect(guard.canActivate(contextWithUser(admin))).toBe(true);
    expect(guard.canActivate(contextWithUser())).toBe(false);
  });

  it('RolesGuard allows only roles declared on the endpoint', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const operator: AccessTokenPayload = {
      ...admin,
      roles: [UserRole.OPERATOR],
    };

    expect(guard.canActivate(contextWithUser(admin))).toBe(true);
    expect(guard.canActivate(contextWithUser(operator))).toBe(false);
  });
});
