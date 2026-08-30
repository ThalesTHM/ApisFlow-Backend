import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { defer, Observable } from 'rxjs';
import { AccessTokenPayload } from '../auth/auth.types';
import { TenantContextService } from './tenant-context.service';

type AuthenticatedRequest = Request & { user?: AccessTokenPayload };

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return defer(() =>
      this.tenantContext.run(request.user?.tenantId, () => next.handle()),
    );
  }
}
