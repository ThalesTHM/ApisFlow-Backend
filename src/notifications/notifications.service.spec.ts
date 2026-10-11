import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prismaMock = {
    notification: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
  };
  const tenantContextMock = {
    requireTenantId: jest.fn(() => 'tenant-a'),
    requireUserId: jest.fn(() => 'user-a'),
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      prismaMock as unknown as PrismaService,
      tenantContextMock as unknown as TenantContextService,
    );
  });

  it('lists only notifications for the current tenant and user', async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', userId: 'user-a' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('cannot mark another user or tenant notification as read', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.markAsRead('notification-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'notification-b',
        tenantId: 'tenant-a',
        userId: 'user-a',
      },
      data: { read: true },
    });
  });
});
