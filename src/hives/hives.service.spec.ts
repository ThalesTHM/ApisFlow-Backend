import { NotFoundException } from '@nestjs/common';
import { ColonyStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { HivesService } from './hives.service';

describe('HivesService', () => {
  const prismaMock = {
    apiary: { findFirst: jest.fn() },
    hive: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const tenantContextMock = {
    requireTenantId: jest.fn(() => 'tenant-a'),
  };
  let service: HivesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HivesService(
      prismaMock as unknown as PrismaService,
      tenantContextMock as unknown as TenantContextService,
    );
  });

  it('filters hives by tenant, apiary, and colony status', async () => {
    prismaMock.hive.findMany.mockResolvedValue([]);

    await service.findAll({
      apiaryId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
      status: ColonyStatus.STRONG,
    });

    expect(prismaMock.hive.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-a',
          apiaryId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
          colonyStatus: ColonyStatus.STRONG,
        },
      }),
    );
  });

  it('rejects an apiary outside the authenticated tenant', async () => {
    prismaMock.apiary.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        apiaryId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        code: 'HIVE-1',
        installationDate: '2026-08-30',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.apiary.findFirst).toHaveBeenCalledWith({
      where: {
        id: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        tenantId: 'tenant-a',
      },
      select: { id: true },
    });
    expect(prismaMock.hive.create).not.toHaveBeenCalled();
  });

  it('scopes delete mutations to the authenticated tenant', async () => {
    prismaMock.hive.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.remove('hive-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.hive.deleteMany).toHaveBeenCalledWith({
      where: { id: 'hive-b', tenantId: 'tenant-a' },
    });
  });
});
