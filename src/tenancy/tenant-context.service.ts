import { ForbiddenException, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  tenantId?: string;
  userId?: string;
  inTransaction?: boolean;
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

  /** Executa o callback dentro de uma transação que já definiu o tenant no banco. */
  runInTransaction<T>(tenantId: string, callback: () => T): T {
    const current = this.storage.getStore();
    return this.storage.run(
      { userId: current?.userId, tenantId, inTransaction: true },
      callback,
    );
  }

  get inTransaction(): boolean {
    return this.storage.getStore()?.inTransaction === true;
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
