import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProductionCycleStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { ProductionCyclesService } from './production-cycles.service';

describe('ProductionCyclesService', () => {
  const prismaMock = {
    hive: { findFirst: jest.fn() },
    productionCycle: {
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
  let service: ProductionCyclesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductionCyclesService(
      prismaMock as unknown as PrismaService,
      tenantContextMock as unknown as TenantContextService,
    );
  });

  it('rejects a hive outside the authenticated tenant', async () => {
    prismaMock.hive.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        hiveId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        startDate: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.hive.findFirst).toHaveBeenCalledWith({
      where: {
        id: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        tenantId: 'tenant-a',
      },
      select: { id: true },
    });
  });

  it('rejects an end date before the start date', async () => {
    prismaMock.hive.findFirst.mockResolvedValue({ id: 'hive-a' });

    await expect(
      service.create({
        hiveId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        startDate: '2026-09-10',
        endDate: '2026-09-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires completion data for completed cycles', async () => {
    prismaMock.hive.findFirst.mockResolvedValue({ id: 'hive-a' });

    await expect(
      service.create({
        hiveId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        startDate: '2026-09-01',
        status: ProductionCycleStatus.COMPLETED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows only one active cycle per hive and tenant', async () => {
    prismaMock.hive.findFirst.mockResolvedValue({ id: 'hive-a' });
    prismaMock.productionCycle.findFirst.mockResolvedValue({ id: 'cycle-a' });

    await expect(
      service.create({
        hiveId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        startDate: '2026-09-01',
        status: ProductionCycleStatus.ACTIVE,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.productionCycle.findFirst).toHaveBeenCalledWith({
      where: {
        hiveId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        tenantId: 'tenant-a',
        status: ProductionCycleStatus.ACTIVE,
      },
      select: { id: true },
    });
  });
});
