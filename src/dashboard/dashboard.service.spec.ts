import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { DashboardService } from './dashboard.service';
import { ProductionPeriod } from './dto/production-query.dto';

describe('DashboardService', () => {
  const prismaMock = {
    apiary: { count: jest.fn() },
    hive: { count: jest.fn() },
    productionCycle: { count: jest.fn() },
    honeyBatch: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    order: { count: jest.fn() },
  };
  const redisMock = { getOrSet: jest.fn() };
  const tenantContextMock = {
    requireTenantId: jest.fn(() => 'tenant-a'),
  };
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.getOrSet.mockImplementation(
      (_key: string, _ttl: number, loader: () => Promise<unknown>) => loader(),
    );
    service = new DashboardService(
      prismaMock as unknown as PrismaService,
      redisMock as unknown as RedisService,
      tenantContextMock as unknown as TenantContextService,
    );
  });

  it('returns tenant-scoped summary metrics through a short-lived cache', async () => {
    prismaMock.apiary.count.mockResolvedValue(2);
    prismaMock.hive.count.mockResolvedValueOnce(8).mockResolvedValueOnce(6);
    prismaMock.productionCycle.count.mockResolvedValue(3);
    prismaMock.honeyBatch.aggregate.mockResolvedValue({
      _sum: { availableQuantityKg: new Prisma.Decimal('42.75') },
    });
    prismaMock.order.count.mockResolvedValue(4);

    await expect(service.summary()).resolves.toEqual({
      totalApiaries: 2,
      totalHives: 8,
      activeHives: 6,
      productionCyclesInProgress: 3,
      honeyStockKg: 42.75,
      pendingOrders: 4,
    });
    expect(redisMock.getOrSet).toHaveBeenCalledWith(
      'dashboard:tenant-a:summary',
      60,
      expect.any(Function),
    );
    expect(prismaMock.apiary.count).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a' },
    });
  });

  it('does not query the database when Redis returns a cached summary', async () => {
    redisMock.getOrSet.mockResolvedValue({ totalApiaries: 9 });

    await service.summary();

    expect(prismaMock.apiary.count).not.toHaveBeenCalled();
  });

  it('groups produced honey by month in chronological order', async () => {
    prismaMock.honeyBatch.findMany.mockResolvedValue([
      {
        productionDate: new Date('2026-01-10T00:00:00.000Z'),
        quantityKg: new Prisma.Decimal(10),
      },
      {
        productionDate: new Date('2026-01-20T00:00:00.000Z'),
        quantityKg: new Prisma.Decimal('2.5'),
      },
      {
        productionDate: new Date('2026-02-01T00:00:00.000Z'),
        quantityKg: new Prisma.Decimal(7),
      },
    ]);

    await expect(
      service.production({ period: ProductionPeriod.MONTH }),
    ).resolves.toEqual([
      { period: '2026-01', quantityKg: 12.5 },
      { period: '2026-02', quantityKg: 7 },
    ]);
    expect(redisMock.getOrSet).toHaveBeenCalledWith(
      'dashboard:tenant-a:production:month',
      60,
      expect.any(Function),
    );
    expect(prismaMock.honeyBatch.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a' },
      select: { productionDate: true, quantityKg: true },
      orderBy: { productionDate: 'asc' },
    });
  });

  it('supports yearly production grouping', async () => {
    prismaMock.honeyBatch.findMany.mockResolvedValue([
      {
        productionDate: new Date('2025-12-01T00:00:00.000Z'),
        quantityKg: new Prisma.Decimal(4),
      },
      {
        productionDate: new Date('2026-01-01T00:00:00.000Z'),
        quantityKg: new Prisma.Decimal(6),
      },
    ]);

    await expect(
      service.production({ period: ProductionPeriod.YEAR }),
    ).resolves.toEqual([
      { period: '2025', quantityKg: 4 },
      { period: '2026', quantityKg: 6 },
    ]);
  });
});
