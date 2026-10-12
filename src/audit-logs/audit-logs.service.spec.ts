import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  const prismaMock = {
    auditLog: { findMany: jest.fn() },
  };
  const tenantContextMock = {
    requireTenantId: jest.fn(() => 'tenant-a'),
  };
  let service: AuditLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditLogsService(
      prismaMock as unknown as PrismaService,
      tenantContextMock as unknown as TenantContextService,
    );
  });

  it('lists audit entries only from the authenticated tenant', async () => {
    prismaMock.auditLog.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
