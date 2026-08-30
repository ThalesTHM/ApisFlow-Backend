import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  findAll() {
    const tenantId = this.tenantContext.requireTenantId();
    const userId = this.tenantContext.requireUserId();
    return this.prisma.notification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const userId = this.tenantContext.requireUserId();
    const result = await this.prisma.notification.updateMany({
      where: { id, tenantId, userId },
      data: { read: true },
    });
    if (result.count === 0) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.findFirstOrThrow({
      where: { id, tenantId, userId },
    });
  }
}
