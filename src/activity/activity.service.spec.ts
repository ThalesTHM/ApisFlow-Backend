import { NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  const prismaMock = {
    auditLog: { create: jest.fn(() => 'audit-query') },
    notification: { create: jest.fn(() => 'notification-query') },
    $transaction: jest.fn(),
  };
  const tenantContextMock = {
    requireTenantId: jest.fn(() => 'tenant-a'),
    requireUserId: jest.fn(() => 'actor-a'),
  };
  let service: ActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActivityService(
      prismaMock as unknown as PrismaService,
      tenantContextMock as unknown as TenantContextService,
    );
  });

  it('records tenant-scoped audit and notification entries together', async () => {
    await service.record({
      type: NotificationType.USER_CREATED,
      message: 'Your account was created',
      action: 'user.created',
      entity: 'User',
      entityId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
      metadata: { role: 'OPERATOR' },
      notificationUserId: 'new-user-a',
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        userId: 'actor-a',
        action: 'user.created',
        entity: 'User',
        entityId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        metadata: { role: 'OPERATOR' },
      },
    });
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-a',
        userId: 'new-user-a',
        type: NotificationType.USER_CREATED,
        message: 'Your account was created',
      },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      'audit-query',
      'notification-query',
    ]);
  });
});
