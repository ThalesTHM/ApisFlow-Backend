import { ConflictException, NotFoundException } from '@nestjs/common';
import { HoneyBatchStatus, HoneyQuality, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { HoneyBatchesService } from './honey-batches.service';

describe('HoneyBatchesService', () => {
  const prismaMock = {
    productionCycle: { findFirst: jest.fn() },
    honeyBatch: {
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
  let service: HoneyBatchesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HoneyBatchesService(
      prismaMock as unknown as PrismaService,
      tenantContextMock as unknown as TenantContextService,
    );
  });

  it('creates available stock in the authenticated tenant', async () => {
    prismaMock.productionCycle.findFirst.mockResolvedValue({ id: 'cycle-a' });
    prismaMock.honeyBatch.create.mockResolvedValue({});

    await service.create({
      productionCycleId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
      code: 'BATCH-001',
      productionDate: '2026-08-30',
      quantityKg: 20,
      quality: HoneyQuality.PREMIUM,
    });

    const createCall = prismaMock.honeyBatch.create.mock.lastCall as
      [Prisma.HoneyBatchCreateArgs] | undefined;
    const createArgs = createCall?.[0];
    expect(createArgs?.data).toMatchObject({
      tenantId: 'tenant-a',
      quantityKg: 20,
      availableQuantityKg: 20,
    });
  });

  it('rejects a production cycle outside the tenant', async () => {
    prismaMock.productionCycle.findFirst.mockResolvedValue(null);

    await expect(
      service.create({
        productionCycleId: '67c4e50e-ae02-45f4-9dd3-e266375b3799',
        code: 'BATCH-001',
        productionDate: '2026-08-30',
        quantityKg: 20,
        quality: HoneyQuality.STANDARD,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaMock.honeyBatch.create).not.toHaveBeenCalled();
  });

  it('prevents total stock from falling below the quantity already sold', async () => {
    prismaMock.honeyBatch.findFirst.mockResolvedValue({
      id: 'batch-a',
      tenantId: 'tenant-a',
      productionCycleId: 'cycle-a',
      code: 'BATCH-001',
      productionDate: new Date('2026-08-30'),
      quantityKg: new Prisma.Decimal(20),
      availableQuantityKg: new Prisma.Decimal(12),
      quality: HoneyQuality.STANDARD,
      status: HoneyBatchStatus.AVAILABLE,
    });

    await expect(
      service.update('batch-a', { quantityKg: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prismaMock.honeyBatch.updateMany).not.toHaveBeenCalled();
  });

  it('scopes deletion to the authenticated tenant', async () => {
    prismaMock.honeyBatch.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.remove('batch-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaMock.honeyBatch.deleteMany).toHaveBeenCalledWith({
      where: { id: 'batch-b', tenantId: 'tenant-a' },
    });
  });
});
