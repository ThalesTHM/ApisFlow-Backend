import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  findAll() {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
