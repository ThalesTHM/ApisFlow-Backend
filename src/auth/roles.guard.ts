import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AccessTokenPayload } from './auth.types';
import { ROLES_KEY } from './roles.decorator';

type AuthenticatedRequest = Request & { user?: AccessTokenPayload };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    return Boolean(user?.roles.some((role) => requiredRoles.includes(role)));
  }
}
