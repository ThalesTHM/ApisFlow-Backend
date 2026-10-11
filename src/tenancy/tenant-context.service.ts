import { ForbiddenException, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  run<T>(
    tenantId: string | undefined,
    userId: string | undefined,
    callback: () => T,
  ): T {
    return this.storage.run({ tenantId, userId }, callback);
  }

  get tenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  requireTenantId(): string {
    const tenantId = this.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    return tenantId;
  }

  requireUserId(): string {
    const userId = this.storage.getStore()?.userId;
    if (!userId) {
      throw new ForbiddenException('User context is required');
    }

    return userId;
  }
}
