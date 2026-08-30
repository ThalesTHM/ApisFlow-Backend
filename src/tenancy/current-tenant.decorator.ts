import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AccessTokenPayload } from '../auth/auth.types';

type AuthenticatedRequest = Request & { user?: AccessTokenPayload };

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const tenantId = context.switchToHttp().getRequest<AuthenticatedRequest>()
      .user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  },
);
