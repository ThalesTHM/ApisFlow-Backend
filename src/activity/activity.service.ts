import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

export interface RecordActivityInput {
  type: NotificationType;
  message: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
  notificationUserId?: string;
}

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async record(input: RecordActivityInput): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const actorUserId = this.tenantContext.requireUserId();

    await this.prisma.$transaction([
      this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          metadata: input.metadata,
        },
      }),
      this.prisma.notification.create({
        data: {
          tenantId,
          userId: input.notificationUserId ?? actorUserId,
          type: input.type,
          message: input.message,
        },
      }),
    ]);
  }
}
