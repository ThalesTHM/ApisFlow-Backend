import { ForbiddenException } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  it('provides tenant and user identity inside the request context', () => {
    const service = new TenantContextService();

    service.run('tenant-a', 'user-a', () => {
      expect(service.requireTenantId()).toBe('tenant-a');
      expect(service.requireUserId()).toBe('user-a');
    });
  });

  it('does not expose identity outside the request context', () => {
    const service = new TenantContextService();

    expect(() => service.requireTenantId()).toThrow(ForbiddenException);
    expect(() => service.requireUserId()).toThrow(ForbiddenException);
  });
});
