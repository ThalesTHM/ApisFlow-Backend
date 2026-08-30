import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenPayload } from '../auth/auth.types';

type AuthenticatedRequest = Request & { user?: AccessTokenPayload };

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    return Boolean(user?.tenantId);
  }
}
